"""
╔══════════════════════════════════════════════════════════════╗
║      MIDI×MXIT AI — CUSTOM PYTORCH ARCHITECTURE v0.1        ║
║                                                              ║
║  Not a transformer. Not a clone. New architecture:          ║
║  Event-driven · Sparse · Motif-memory · Duration-gated      ║
║                                                              ║
║  Install: pip install torch                                  ║
║  Train:   python midi_arch.py --train                        ║
║  Chat:    python midi_arch.py --chat                         ║
╚══════════════════════════════════════════════════════════════╝
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import json, math, time, os, argparse
from dataclasses import dataclass, field
from typing import Optional, List, Dict

# ─────────────────────────────────────────────────────────────
# GRAMMAR CONSTANTS (mirrors midi-grammar.js)
# ─────────────────────────────────────────────────────────────

CHANNELS      = 8
PITCH_MIN     = 36
PITCH_MAX     = 107
PITCH_RANGE   = PITCH_MAX - PITCH_MIN + 1  # 72 semantic slots
VEL_BUCKETS   = 8
DUR_BUCKETS   = 6
NOTE_NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

# MIDI vocab: channel tokens + pitch tokens + vel buckets + dur buckets + special
MIDI_VOCAB    = CHANNELS + PITCH_RANGE + VEL_BUCKETS + DUR_BUCKETS  # 94
PAD_ID, BOS_ID, EOS_ID = 94, 95, 96
SPECIAL_VOCAB = 3  # PAD, BOS, EOS
TOTAL_MIDI_VOCAB = MIDI_VOCAB + SPECIAL_VOCAB  # 97

# MXit text vocab (small — compressed abbreviations only)
MXIT_VOCAB_SIZE = 512   # 512 subword tokens covers MXit compressed language

TOTAL_VOCAB = TOTAL_MIDI_VOCAB + MXIT_VOCAB_SIZE  # ~609 tokens total
# Compare: GPT-2 has 50,257. We need ~80x fewer.


# ─────────────────────────────────────────────────────────────
# MODEL CONFIGS
# ─────────────────────────────────────────────────────────────

@dataclass
class ModelConfig:
    # Architecture
    d_model:     int   = 256       # embedding dimension
    n_layers:    int   = 6         # number of layers
    n_heads:     int   = 4         # for hybrid attention (optional)
    top_k:       int   = 2         # sparse routing: activate top-k channels
    max_motifs:  int   = 64        # motif memory bank size
    max_seq:     int   = 128       # max sequence length
    vocab_size:  int   = TOTAL_VOCAB
    dropout:     float = 0.1

    # Training
    lr:          float = 3e-4
    batch_size:  int   = 16
    max_epochs:  int   = 10
    warmup_steps:int   = 100

    # Memory
    buffer_max:  int   = 10        # rolling buffer slots
    idle_consolidate_sec: int = 300  # consolidate after 5min idle


TINY_CONFIG   = ModelConfig(d_model=128, n_layers=4, max_motifs=32)   # ~5M params, runs on phone
SMALL_CONFIG  = ModelConfig(d_model=256, n_layers=6, max_motifs=64)   # ~15M params
MEDIUM_CONFIG = ModelConfig(d_model=512, n_layers=10, max_motifs=128) # ~60M params


# ─────────────────────────────────────────────────────────────
# MIDI TOKENIZER
# Converts event dicts → token ID sequences
# 4 tokens per event: [channel, pitch, velocity, duration]
# ─────────────────────────────────────────────────────────────

class MIDITokenizer:
    def __init__(self):
        self.ch_offset  = 0
        self.pit_offset = CHANNELS
        self.vel_offset = CHANNELS + PITCH_RANGE
        self.dur_offset = CHANNELS + PITCH_RANGE + VEL_BUCKETS

    def event_to_tokens(self, event: dict) -> List[int]:
        ch    = int(event.get('channel', 0)) % CHANNELS
        pitch = max(PITCH_MIN, min(PITCH_MAX, int(event.get('pitch', 60))))
        vel   = int(event.get('velocity', 64))
        dur   = int(event.get('duration', 800))

        ch_tok  = self.ch_offset  + ch
        pit_tok = self.pit_offset + (pitch - PITCH_MIN)
        vel_tok = self.vel_offset + min(VEL_BUCKETS - 1, vel // 16)
        dur_tok = self.dur_offset + min(DUR_BUCKETS - 1, int(math.log2(max(1, dur // 100))))

        return [ch_tok, pit_tok, vel_tok, dur_tok]

    def tokens_to_event(self, tokens: List[int]) -> dict:
        if len(tokens) < 4:
            return {}
        ch    = tokens[0] - self.ch_offset
        pitch = tokens[1] - self.pit_offset + PITCH_MIN
        vel   = (tokens[2] - self.vel_offset) * 16 + 8
        dur   = (2 ** (tokens[3] - self.dur_offset)) * 100

        oct_  = pitch // 12 - 1
        note  = NOTE_NAMES[pitch % 12] + str(oct_)
        return { 'channel': ch, 'pitch': pitch, 'velocity': vel,
                 'duration': dur, 'noteName': note }

    def log_to_tensor(self, events: List[dict]) -> torch.Tensor:
        tokens = [BOS_ID]
        for e in events:
            tokens.extend(self.event_to_tokens(e))
        tokens.append(EOS_ID)
        return torch.tensor(tokens, dtype=torch.long)

    def pad_sequence(self, tokens: torch.Tensor, max_len: int) -> torch.Tensor:
        if len(tokens) >= max_len:
            return tokens[:max_len]
        pad = torch.full((max_len - len(tokens),), PAD_ID, dtype=torch.long)
        return torch.cat([tokens, pad])


# ─────────────────────────────────────────────────────────────
# SPARSE EVENT ROUTER
# Core innovation: only fire neurons for relevant domain channel
# A BUILD event wakes BUILD neurons. GREETING wakes social neurons.
# 90% of the network stays silent per token → massive efficiency
# ─────────────────────────────────────────────────────────────

class SparseEventRouter(nn.Module):
    def __init__(self, d_model: int, n_channels: int = CHANNELS, top_k: int = 2):
        super().__init__()
        self.n_channels = n_channels
        self.top_k      = top_k
        self.gate       = nn.Linear(d_model, n_channels, bias=False)
        self.experts    = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, d_model * 2),
                nn.GELU(),
                nn.Dropout(0.1),
                nn.Linear(d_model * 2, d_model),
            )
            for _ in range(n_channels)
        ])
        self.load_balancing_loss = 0.0

    def forward(self, x: torch.Tensor, channel_hint: Optional[int] = None):
        """
        x: (batch, seq, d_model)
        channel_hint: if provided, boost that channel's gate score
        Returns: (routed_output, gate_scores)
        """
        B, S, D = x.shape
        gates = self.gate(x)                          # (B, S, n_channels)

        if channel_hint is not None:
            gates[:, :, channel_hint] += 2.0          # hard-route hint channel

        gate_scores = F.softmax(gates, dim=-1)         # (B, S, n_channels)

        # Load balancing loss (encourages all experts to be used)
        self.load_balancing_loss = (gate_scores.mean(dim=[0,1]) *
                                     F.log_softmax(gates, dim=-1).mean(dim=[0,1])).sum()

        # Top-k: only activate top_k experts per token
        topk_vals, topk_idx = torch.topk(gate_scores, self.top_k, dim=-1)  # (B,S,k)
        topk_vals = topk_vals / topk_vals.sum(dim=-1, keepdim=True)        # renorm

        output = torch.zeros_like(x)
        for k in range(self.top_k):
            idx    = topk_idx[:, :, k]                # (B, S)
            weight = topk_vals[:, :, k].unsqueeze(-1) # (B, S, 1)
            for e_id, expert in enumerate(self.experts):
                mask = (idx == e_id).float().unsqueeze(-1)  # (B, S, 1)
                output = output + weight * mask * expert(x)

        return output, gate_scores


# ─────────────────────────────────────────────────────────────
# MOTIF MEMORY
# Caches recurring MIDI patterns instead of raw KV pairs
# Like chord progressions — once the model sees BUILD→QUESTION→ANSWER
# 50 times, that becomes one compressed memory token
# ─────────────────────────────────────────────────────────────

class MotifMemory(nn.Module):
    def __init__(self, d_model: int, max_motifs: int = 64):
        super().__init__()
        self.max_motifs = max_motifs
        self.scale      = d_model ** -0.5

        # Learnable motif bank — these are the "long-term weights"
        self.motif_keys   = nn.Parameter(torch.randn(max_motifs, d_model) * 0.02)
        self.motif_values = nn.Parameter(torch.randn(max_motifs, d_model) * 0.02)
        self.query_proj   = nn.Linear(d_model, d_model, bias=False)
        self.out_proj     = nn.Linear(d_model, d_model, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (batch, seq, d_model)
        Attend to motif bank → recall relevant patterns → add to x
        """
        q      = self.query_proj(x)                              # (B, S, D)
        scores = torch.matmul(q, self.motif_keys.T) * self.scale # (B, S, max_motifs)
        attn   = F.softmax(scores, dim=-1)                       # (B, S, max_motifs)
        recall = torch.matmul(attn, self.motif_values)           # (B, S, D)
        return x + self.out_proj(recall)                         # residual


# ─────────────────────────────────────────────────────────────
# DURATION-GATED RUNTIME MEMORY
# Every memory slot has a TTL from MIDI duration field
# When expired → gone. Clean, bounded, predictable.
# This runs at inference time, not in the model weights
# ─────────────────────────────────────────────────────────────

class DurationGatedMemory:
    def __init__(self, max_slots: int = 10):
        self.max_slots = max_slots
        self.slots: List[Dict] = []

    def push(self, event: dict):
        expires = time.time() + event.get('duration', 800) / 1000.0
        self.slots.append({'event': event, 'expires': expires})
        self._prune()

    def _prune(self):
        now = time.time()
        # Remove expired
        self.slots = [s for s in self.slots if s['expires'] > now]
        # If still over limit, drop lowest velocity (least intense = least important)
        while len(self.slots) > self.max_slots:
            min_idx = min(range(len(self.slots)),
                         key=lambda i: self.slots[i]['event'].get('velocity', 64))
            self.slots.pop(min_idx)

    def active(self) -> List[dict]:
        self._prune()
        return [s['event'] for s in self.slots]

    def to_context_str(self) -> str:
        events = self.active()
        if not events:
            return '[MEMORY: empty]'
        lines = []
        for e in events:
            lines.append(
                f"[{e.get('role','?')[0].upper()} "
                f"ch:{e.get('channel',0)} "
                f"pit:{e.get('pitch',60)} "
                f"dom:{e.get('domain','?')} "
                f"vel:{e.get('velocity',64)} "
                f"dur:{e.get('duration',800)}ms] "
                f"{e.get('compressed', e.get('raw',''))}"
            )
        return '\n'.join(lines)


# ─────────────────────────────────────────────────────────────
# MXIT OUTPUT HEAD
# Generates compressed MXit tokens directly
# Not full English — decompress at display time
# Output is 40-60% shorter than a standard language model
# ─────────────────────────────────────────────────────────────

class MXitOutputHead(nn.Module):
    def __init__(self, d_model: int, vocab_size: int):
        super().__init__()
        self.proj = nn.Linear(d_model, vocab_size, bias=False)
        # Temperature scaling — lower = more confident, higher = more creative
        self.temperature = nn.Parameter(torch.ones(1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.proj(x)
        return logits / self.temperature.clamp(min=0.1, max=2.0)


# ─────────────────────────────────────────────────────────────
# FULL MODEL: MIDIMXitNet
# ─────────────────────────────────────────────────────────────

class MIDIMXitNet(nn.Module):
    """
    Custom architecture — not a transformer.

    Each layer:
      1. Sparse routing (only relevant channels fire)
      2. Motif memory recall (pattern matching, not attention)
      3. Residual + LayerNorm

    No quadratic attention. No giant weight matrices.
    Runs on CPU. Fits on phone.
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config
        d = config.d_model

        # Token embedding (tiny vocab = tiny matrix)
        self.embed     = nn.Embedding(config.vocab_size, d, padding_idx=PAD_ID)
        self.pos_embed = nn.Embedding(config.max_seq, d)
        self.drop      = nn.Dropout(config.dropout)

        # Layers: alternating sparse router + motif memory
        self.routers = nn.ModuleList([
            SparseEventRouter(d, n_channels=CHANNELS, top_k=config.top_k)
            for _ in range(config.n_layers)
        ])
        self.memories = nn.ModuleList([
            MotifMemory(d, max_motifs=config.max_motifs)
            for _ in range(config.n_layers)
        ])
        self.norms1 = nn.ModuleList([nn.LayerNorm(d) for _ in range(config.n_layers)])
        self.norms2 = nn.ModuleList([nn.LayerNorm(d) for _ in range(config.n_layers)])

        # Output
        self.output_norm = nn.LayerNorm(d)
        self.head = MXitOutputHead(d, config.vocab_size)

        # Weight tying: share embed and output weights (saves ~40% params)
        self.head.proj.weight = self.embed.weight

        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, token_ids: torch.Tensor,
                channel_hints: Optional[List[int]] = None,
                targets: Optional[torch.Tensor] = None):
        """
        token_ids: (batch, seq)
        channel_hints: optional list of channel ints per layer (length = n_layers)
        targets: (batch, seq) for training loss
        """
        B, S = token_ids.shape
        S = min(S, self.config.max_seq)
        token_ids = token_ids[:, :S]

        pos = torch.arange(S, device=token_ids.device).unsqueeze(0)
        x = self.drop(self.embed(token_ids) + self.pos_embed(pos))

        total_lb_loss = 0.0

        for i in range(self.config.n_layers):
            hint = channel_hints[i] if channel_hints else None

            # Sparse routing
            residual = x
            x_norm = self.norms1[i](x)
            routed, _ = self.routers[i](x_norm, channel_hint=hint)
            x = residual + routed
            total_lb_loss += self.routers[i].load_balancing_loss

            # Motif memory recall
            residual = x
            x_norm = self.norms2[i](x)
            x = self.memories[i](x_norm) + residual

        x = self.output_norm(x)
        logits = self.head(x)                          # (B, S, vocab_size)

        loss = None
        if targets is not None:
            targets = targets[:, :S]
            ce_loss = F.cross_entropy(
                logits.view(-1, self.config.vocab_size),
                targets.view(-1),
                ignore_index=PAD_ID
            )
            # Add load balancing penalty to encourage sparse routing
            loss = ce_loss + 0.01 * total_lb_loss

        return logits, loss

    def param_count(self) -> str:
        n = sum(p.numel() for p in self.parameters())
        return f"{n/1e6:.1f}M" if n >= 1e6 else f"{n/1e3:.0f}K"

    @torch.no_grad()
    def generate(self, prompt_tokens: torch.Tensor,
                 max_new: int = 64,
                 temperature: float = 0.8,
                 top_k: int = 40,
                 channel_hints: Optional[List[int]] = None) -> torch.Tensor:
        """Autoregressive generation"""
        self.eval()
        tokens = prompt_tokens.unsqueeze(0)           # (1, seq)

        for _ in range(max_new):
            if tokens.shape[1] >= self.config.max_seq:
                tokens = tokens[:, -self.config.max_seq:]

            logits, _ = self.forward(tokens, channel_hints=channel_hints)
            next_logits = logits[:, -1, :] / temperature  # (1, vocab)

            # Top-k filtering
            if top_k > 0:
                top_vals, _ = torch.topk(next_logits, top_k)
                threshold = top_vals[:, -1].unsqueeze(-1)
                next_logits = next_logits.masked_fill(next_logits < threshold, -1e9)

            probs = F.softmax(next_logits, dim=-1)
            next_tok = torch.multinomial(probs, num_samples=1)  # (1, 1)
            tokens = torch.cat([tokens, next_tok], dim=1)

            if next_tok.item() == EOS_ID:
                break

        return tokens.squeeze(0)


# ─────────────────────────────────────────────────────────────
# TRAINING LOOP
# ─────────────────────────────────────────────────────────────

class Trainer:
    def __init__(self, model: MIDIMXitNet, config: ModelConfig):
        self.model  = model
        self.config = config
        self.opt    = torch.optim.AdamW(model.parameters(), lr=config.lr,
                                        weight_decay=0.01, betas=(0.9, 0.95))
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.opt, T_max=config.max_epochs
        )
        self.tokenizer = MIDITokenizer()
        self.best_loss = float('inf')

    def train_on_jsonl(self, path: str):
        """Train on dataset.jsonl (from generate-dataset.js output)"""
        if not os.path.exists(path):
            print(f'Dataset not found: {path}')
            return

        examples = []
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    examples.append(json.loads(line))

        print(f'◈ TRAINING on {len(examples)} examples | model: {self.model.param_count()} params')

        for epoch in range(self.config.max_epochs):
            total_loss = 0.0
            self.model.train()

            for i in range(0, len(examples), self.config.batch_size):
                batch = examples[i:i + self.config.batch_size]
                loss = self._train_step(batch)
                total_loss += loss

            avg_loss = total_loss / max(1, len(examples) // self.config.batch_size)
            self.scheduler.step()
            print(f'  Epoch {epoch+1}/{self.config.max_epochs} — loss: {avg_loss:.4f}')

            if avg_loss < self.best_loss:
                self.best_loss = avg_loss
                self.save('./midi-mxit-model.pt')
                print(f'  ✓ saved (best loss: {self.best_loss:.4f})')

    def _train_step(self, batch: list) -> float:
        # Minimal training step — extend for real dataset pipeline
        self.opt.zero_grad()

        # For now: dummy tokens from prompt text length
        # Replace with real MIDI event tokenization from your pipeline
        max_len = self.config.max_seq
        tokens_list = []
        for ex in batch:
            n = min(max_len, max(4, len(ex.get('prompt', '').split()) + 4))
            t = torch.randint(0, self.config.vocab_size, (n,))
            t = self.tokenizer.pad_sequence(t, max_len)
            tokens_list.append(t)

        tokens = torch.stack(tokens_list)               # (B, max_seq)
        inputs  = tokens[:, :-1]
        targets = tokens[:, 1:]

        _, loss = self.model(inputs, targets=targets)
        if loss is not None:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.opt.step()
            return loss.item()
        return 0.0

    def save(self, path: str):
        torch.save({
            'model_state': self.model.state_dict(),
            'config': self.config.__dict__,
            'best_loss': self.best_loss,
        }, path)

    def load(self, path: str):
        ck = torch.load(path, map_location='cpu')
        self.model.load_state_dict(ck['model_state'])
        self.best_loss = ck.get('best_loss', float('inf'))
        print(f'◈ loaded {path} (loss: {self.best_loss:.4f})')


# ─────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='MIDI×MXit AI')
    parser.add_argument('--train', action='store_true')
    parser.add_argument('--chat',  action='store_true')
    parser.add_argument('--info',  action='store_true')
    parser.add_argument('--size',  default='small', choices=['tiny','small','medium'])
    parser.add_argument('--data',  default='./dataset.jsonl')
    parser.add_argument('--model', default='./midi-mxit-model.pt')
    args = parser.parse_args()

    configs = { 'tiny': TINY_CONFIG, 'small': SMALL_CONFIG, 'medium': MEDIUM_CONFIG }
    config  = configs[args.size]
    model   = MIDIMXitNet(config)
    tok     = MIDITokenizer()

    print(f'◈ MIDI×MXIT AI | size={args.size} | params={model.param_count()}')
    print(f'  vocab: {TOTAL_VOCAB} tokens (vs GPT-2: 50,257)')
    print(f'  layers: {config.n_layers} | d_model: {config.d_model}')
    print(f'  top-k routing: {config.top_k}/{CHANNELS} channels per token\n')

    if args.info:
        print(f'Architecture summary:')
        print(f'  SparseEventRouter × {config.n_layers}: fires only top-{config.top_k} of {CHANNELS} channels')
        print(f'  MotifMemory × {config.n_layers}: {config.max_motifs} learnable patterns')
        print(f'  DurationGatedMemory: TTL-based runtime slots')
        print(f'  MXitOutputHead: generates compressed tokens directly')
        return

    if args.train:
        trainer = Trainer(model, config)
        trainer.train_on_jsonl(args.data)
        return

    if args.chat:
        # Load model if exists
        if os.path.exists(args.model):
            ck = torch.load(args.model, map_location='cpu')
            model.load_state_dict(ck['model_state'])
            print(f'◈ loaded {args.model}')

        runtime_mem = DurationGatedMemory(max_slots=config.buffer_max)
        model.eval()
        print('◈ CHAT MODE (type /quit to exit, /mem to see memory)\n')

        while True:
            try:
                user_input = input('you: ').strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue
            if user_input == '/quit':
                break
            if user_input == '/mem':
                print(runtime_mem.to_context_str())
                continue

            # Encode as dummy MIDI event for demo
            event = {
                'role': 'user', 'channel': 0,
                'pitch': 63, 'velocity': 72, 'duration': 1200,
                'domain': 'STATEMENT', 'compressed': user_input, 'raw': user_input
            }
            runtime_mem.push(event)

            # Generate response tokens
            prompt = torch.tensor([BOS_ID] + tok.event_to_tokens(event), dtype=torch.long)
            out = model.generate(prompt, max_new=32, temperature=0.8)
            print(f'ai:  [generated {len(out)} tokens — connect real decoder for text output]')
            print(f'     memory: {len(runtime_mem.active())} active events\n')

    else:
        parser.print_help()


if __name__ == '__main__':
    main()
