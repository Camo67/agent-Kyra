import { useState, useRef, useEffect } from "react";
import KYRA_SYSTEM_PROMPT from "./kyra-system-prompt.js";

// ═══════════════════════════════════════════════════════
// MXIT COMPRESSION ENGINE
// Lossy tokenization — same as what we did on GPRS
// ═══════════════════════════════════════════════════════
const ABBREV = [
  ['thank you','ty'],['because','coz'],['tonight','2nyt'],['tomorrow','2moro'],
  ['something','smth'],['nothing','nth'],['everything','evrthn'],['probably','prob'],
  ['definitely','def'],['really','rly'],['information','info'],['without','w/o'],
  ['through','thru'],['people','ppl'],['please','plz'],['thanks','thx'],
  ['before','b4'],['later','l8r'],['great','gr8'],['going','goin'],
  ['about','abt'],['right','ryt'],['what','wt'],['your','ur'],
  ['know','knw'],['think','thnk'],['want','wnt'],['need','nd'],
  ['have','hv'],['make','mk'],['build','bld'],['create','crt'],
  ['model','mdl'],['memory','mem'],['system','sys'],['local','lcl'],
  ['message','msg'],['where','whr'],['when','wen'],['with','w/'],
  ['and','n'],['that','dat'],['this','dis'],['you','u'],
  ['are','r'],['for','4'],['to','2'],['see','c'],['be','b'],
  ['why','y'],['how','hw'],['okay','k'],['love','luv'],
];

function mxitCompress(text) {
  let c = text.toLowerCase().trim();
  ABBREV.sort((a, b) => b[0].length - a[0].length)
    .forEach(([w, a]) => {
      c = c.replace(new RegExp(`\\b${w}\\b`, 'g'), a);
    });
  return c.replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════
// MIDI ENCODER
// Every message becomes a musical event
// pitch = topic hash, velocity = intensity,
// duration = importance weight, channel = speaker layer
// ═══════════════════════════════════════════════════════
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ROLE_CHANNEL = { user: 0, assistant: 1, system: 2 };

function encodeMIDI(text, role = 'user') {
  // Pitch: semantic hash → range 36–83 (3 octaves)
  let h = 0;
  for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  const pitch = 36 + (Math.abs(h) % 48);

  // Velocity: punctuation energy → 40–127
  const bangs = (text.match(/!/g) || []).length;
  const asks  = (text.match(/\?/g) || []).length;
  const caps  = (text.match(/[A-Z]/g) || []).length;
  const velocity = Math.min(127, 40 + bangs * 18 + asks * 12 + Math.floor(caps * 0.8));

  // Duration: word count → 200–3000ms (importance persistence)
  const words = text.split(/\s+/).length;
  const duration = Math.min(3000, 200 + words * 100);

  const channel = ROLE_CHANNEL[role] ?? 0;
  const octave  = Math.floor(pitch / 12) - 1;
  const noteName = NOTE_NAMES[pitch % 12] + octave;

  return { pitch, velocity, duration, channel, noteName, role };
}

// ═══════════════════════════════════════════════════════
// ROLLING MXIT MEMORY BUFFER
// Max 10 events — window slides, oldest drops
// No weights file — the log IS the memory
// ═══════════════════════════════════════════════════════
const MAX_MEM = 10;

class MXitBuffer {
  constructor() { this.log = []; }

  push(text, role) {
    const compressed = mxitCompress(text);
    const midi = encodeMIDI(text, role);
    const entry = {
      id: Date.now() + Math.random(),
      raw: text, compressed, midi, role,
      ts: new Date().toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' })
    };
    this.log.push(entry);
    if (this.log.length > MAX_MEM) this.log.shift();
    return entry;
  }

  // Serialise to compact MIDI+MXit format for API context
  toContext() {
    return this.log.map(e =>
      `[${e.role[0].toUpperCase()} ch:${e.midi.channel} n:${e.midi.noteName} v:${e.midi.velocity} d:${e.midi.duration}ms] ${e.compressed}`
    ).join('\n');
  }

  snapshot() { return [...this.log]; }
}

// ═══════════════════════════════════════════════════════
// PIANO ROLL — 24 keys, C3–B4
// ═══════════════════════════════════════════════════════
function PianoRoll({ activeNote }) {
  const keys = Array.from({ length: 24 }, (_, i) => {
    const midi = 36 + i;
    const name = NOTE_NAMES[midi % 12];
    return {
      midi, name,
      isBlack: name.includes('#'),
      isActive: activeNote?.pitch === midi
    };
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 1,
      padding: '6px 12px', background: '#05090505',
      borderBottom: '1px solid #1a2a1a', height: 44,
    }}>
      <span style={{ fontSize: 8, color: '#2a4a1a', marginRight: 4, alignSelf: 'center', letterSpacing: 1 }}>♩</span>
      {keys.map(k => (
        <div key={k.midi} style={{
          width: k.isBlack ? 7 : 9,
          height: k.isBlack ? 22 : 30,
          background: k.isActive
            ? '#7ec832'
            : k.isBlack ? '#152515' : '#1c2e1c',
          border: `1px solid ${k.isActive ? '#7ec832' : '#253525'}`,
          borderRadius: 2,
          transition: 'all 0.08s ease',
          boxShadow: k.isActive ? '0 0 10px #7ec83266' : 'none',
          flexShrink: 0,
        }} />
      ))}
      {activeNote && (
        <div style={{ marginLeft: 8, fontSize: 9, color: '#8ab960', alignSelf: 'center', letterSpacing: 1, whiteSpace: 'nowrap' }}>
          {activeNote.noteName} · v{activeNote.velocity} · ch{activeNote.channel}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MEMORY PANEL
// ═══════════════════════════════════════════════════════
function MemoryPanel({ log }) {
  return (
    <div style={{
      maxHeight: 200, overflowY: 'auto',
      background: '#04080405',
      borderBottom: '1px solid #1a2a1a',
      padding: '8px 12px',
      fontSize: 9, lineHeight: 1.7,
    }}>
      <div style={{ color: '#2a4a2a', letterSpacing: 2, marginBottom: 6, fontSize: 8 }}>
        ── MXIT BUFFER [{log.length}/{MAX_MEM}] ──
      </div>
      {log.length === 0
        ? <div style={{ color: '#1a3a1a' }}>buffer empty. send first msg.</div>
        : log.map(e => (
          <div key={e.id} style={{
            marginBottom: 5,
            borderLeft: `2px solid ${e.role === 'user' ? '#3a6a2a' : '#2a5a4a'}`,
            paddingLeft: 6,
          }}>
            <span style={{ color: '#2a4a2a' }}>
              {e.ts} n:{e.midi.noteName} v:{e.midi.velocity}
            </span>
            {' '}<span style={{ color: '#5a8a3a' }}>{e.compressed}</span>
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function MIDIMXitAI() {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [memLog, setMemLog]         = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [showMem, setShowMem]       = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [stats, setStats]           = useState({ calls: 0, tokens: 0 });
  const buffer    = useRef(new MXitBuffer());
  const chatEnd   = useRef(null);
  const inputRef  = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function speakText(text) {
    if (!speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
      }
      setRecognitionActive(false);
      inputRef.current?.focus();
    };

    recognition.onend = () => {
      setRecognitionActive(false);
    };

    recognition.onerror = () => {
      setRecognitionActive(false);
    };

    recognitionRef.current = recognition;
  }, []);

  function startSpeechRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.start();
      setRecognitionActive(true);
    } catch (error) {
      setRecognitionActive(false);
    }
  }

  function stopSpeechRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
    setRecognitionActive(false);
  }

  function toggleSpeechRecognition() {
    if (recognitionActive) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  }

  function flash(midi) {
    setActiveNote(midi);
    setTimeout(() => setActiveNote(null), Math.min(midi.duration, 1500));
  }

  async function send() {
    if (!input.trim() || loading) return;
    if (recognitionActive) stopSpeechRecognition();
    const text = input.trim();
    setInput('');

    const userEntry = buffer.current.push(text, 'user');
    setMemLog(buffer.current.snapshot());
    flash(userEntry.midi);
    setMessages(prev => [...prev, {
      role: 'user', text,
      compressed: userEntry.compressed,
      midi: userEntry.midi
    }]);

    setLoading(true);
    const ctx = buffer.current.toContext();

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: KYRA_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `MIDI+MXIT MEMORY:\n${ctx}\n\n---\nReply to last user message.`
          }]
        })
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'ERR: empty response';
      const usage = data.usage || {};

      const aEntry = buffer.current.push(reply, 'assistant');
      setMemLog(buffer.current.snapshot());
      flash(aEntry.midi);
      setStats(s => ({
        calls: s.calls + 1,
        tokens: s.tokens + (usage.input_tokens || 0) + (usage.output_tokens || 0)
      }));
      setMessages(prev => [...prev, {
        role: 'assistant', text: reply,
        compressed: aEntry.compressed,
        midi: aEntry.midi
      }]);
      speakText(reply);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: 'ERR: ' + err.message }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      background: '#080d08',
      color: '#7ec832',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
      borderLeft: '1px solid #1a2a1a',
      borderRight: '1px solid #1a2a1a',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #1a2a1a',
        background: '#0b100b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 'bold', letterSpacing: 3, color: '#8ab960' }}>
            ◈ MIDI×MXIT AI
          </div>
          <div style={{ fontSize: 8, color: '#3a5a2a', letterSpacing: 2 }}>
            SYMBOLIC MEMORY ENGINE v0.1
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 8, color: '#2a4a2a', textAlign: 'right' }}>
            <div>calls: {stats.calls}</div>
            <div>tokens: {stats.tokens}</div>
          </div>
          <button onClick={() => setSpeechEnabled(!speechEnabled)} style={{
            background: 'none', border: `1px solid ${speechEnabled ? '#4a7a2a' : '#3a3a3a'}`,
            color: speechEnabled ? '#7ec832' : '#5a7a3a',
            padding: '3px 8px', fontSize: 9, cursor: 'pointer', letterSpacing: 1,
            fontFamily: 'inherit',
          }}>
            {speechEnabled ? 'TTS ON' : 'TTS OFF'}
          </button>
          <button onClick={() => setShowMem(!showMem)} style={{
            background: 'none', border: '1px solid #2a4a1a', color: '#5a7a3a',
            padding: '3px 8px', fontSize: 9, cursor: 'pointer', letterSpacing: 1,
            fontFamily: 'inherit',
          }}>
            {showMem ? '▲' : '▼'} MEM
          </button>
        </div>
      </div>

      {/* PIANO ROLL */}
      <PianoRoll activeNote={activeNote} />

      {/* MEMORY BUFFER */}
      {showMem && <MemoryPanel log={memLog} />}

      {/* CHAT */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 320,
      }}>
        {messages.length === 0 && (
          <div style={{
            margin: '40px auto',
            textAlign: 'center',
            color: '#1e3a1e',
            fontSize: 10,
            lineHeight: 2.2,
            letterSpacing: 1,
          }}>
            ◈ MIDI×MXIT MEMORY AI<br/>
            <span style={{ fontSize: 8, color: '#162a16' }}>
              every msg → midi note event → mxit buffer<br/>
              no weights. notes r da memory.<br/>
              tap ▼ MEM 2 c da buffer.
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{
              background: msg.role === 'user'
                ? '#0e1e0e'
                : msg.role === 'error' ? '#1a0a0a' : '#0a140a',
              border: `1px solid ${
                msg.role === 'user' ? '#2e5a1e'
                : msg.role === 'error' ? '#5a1a1a' : '#1e3a2e'
              }`,
              borderRadius: 3,
              padding: '8px 11px',
              fontSize: 12,
              lineHeight: 1.55,
              color: msg.role === 'user' ? '#8ab960'
                : msg.role === 'error' ? '#8a4a4a' : '#5ab090',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.text}
            </div>
            {msg.midi && (
              <div style={{
                fontSize: 8, color: '#1e3a1e', marginTop: 2, letterSpacing: 0.5,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                ♩ {msg.midi.noteName} · v{msg.midi.velocity} · {msg.midi.duration}ms
                {msg.compressed && msg.compressed !== msg.text.toLowerCase() &&
                  <span style={{ marginLeft: 6, color: '#1a2e1a' }}>→ "{msg.compressed.slice(0, 40)}{msg.compressed.length > 40 ? '…' : ''}"</span>
                }
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: '#0a140a',
            border: '1px solid #1e3a2e',
            borderRadius: 3,
            padding: '8px 12px',
            fontSize: 12, color: '#3a6a4a',
          }}>
            <Blink>▋</Blink> decoding memory...
          </div>
        )}

        <div ref={chatEnd} />
      </div>

      {/* INPUT */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #1a2a1a',
        background: '#0b100b',
        display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="typ ur msg…"
          style={{
            flex: 1, background: '#060c06',
            border: '1px solid #1e3a1e',
            color: '#7ec832', padding: '7px 11px',
            fontSize: 12, fontFamily: 'inherit', outline: 'none',
            borderRadius: 2,
          }}
        />
        <button
          onClick={toggleSpeechRecognition}
          disabled={typeof window === 'undefined' || !(window.SpeechRecognition || window.webkitSpeechRecognition)}
          style={{
            background: recognitionActive ? '#274a29' : '#0e140e',
            border: `1px solid ${recognitionActive ? '#5a8a3a' : '#1a2a1a'}`,
            color: recognitionActive ? '#a8ffb0' : '#7ec832',
            padding: '7px 13px', fontSize: 11,
            fontFamily: 'inherit', cursor: 'pointer',
            letterSpacing: 1, borderRadius: 2,
            transition: 'all 0.15s',
          }}
        >
          {recognitionActive ? 'LISTENING' : 'MIC'}
        </button>
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? '#0e140e' : '#142414',
            border: `1px solid ${loading || !input.trim() ? '#1a2a1a' : '#3a6a2a'}`,
            color: loading || !input.trim() ? '#2a3a2a' : '#7ec832',
            padding: '7px 13px', fontSize: 11,
            fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
            letterSpacing: 1, borderRadius: 2,
            transition: 'all 0.15s',
          }}
        >
          SND
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #060c06; }
        ::-webkit-scrollbar-thumb { background: #1e3a1e; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  );
}

function Blink({ children }) {
  return <span style={{ animation: 'blink 0.9s infinite' }}>{children}</span>;
}
