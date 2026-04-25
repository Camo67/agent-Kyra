/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         MIDI×MXIT AI — SELF-LEARNING LOOP v0.1              ║
 * ║                                                              ║
 * ║  Three learning mechanisms running in parallel:             ║
 * ║   A. Reinforcement from conversation signals                ║
 * ║   B. Self-play (model debates itself)                       ║
 * ║   C. Memory consolidation (sleep cycle)                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import readline from 'readline';
import KYRA_SYSTEM_PROMPT from '../kyra-system-prompt.js';

// ─────────────────────────────────────────────────────────────
// A. SIGNAL EXTRACTOR
// Reads natural MXit reactions — no labels needed
// The conversation IS the training signal
// ─────────────────────────────────────────────────────────────

const SIGNALS = {
  strong_positive: ['exactly', 'perfect', 'dat it', 'yes bro', 'correct', 'spot on', 'gr8', 'nice one', 'bet', '🔥', '💯', 'finally', 'yes!'],
  weak_positive:   ['k thx', 'ty', 'ok', 'k', 'got it', 'makes sense', 'ayt', 'cool', 'good', 'thx'],
  weak_negative:   ['hmm', 'idk', 'not sure', 'maybe', 'sort of', 'kinda', 'not rly'],
  strong_negative: ['no', 'wrong', 'dat wrong', 'not wt i meant', 'confused', 'huh', 'wt', 'try again', 'nope', 'nah', 'incorrect', 'u missed da point'],
  repeat_signal:   null, // detected by pattern, not keywords
};

const SCORE_MAP = {
  strong_positive: +1.0,
  weak_positive:   +0.4,
  weak_negative:   -0.3,
  strong_negative: -1.0,
};

export function extractSignal(userText, previousUserText = null) {
  const t = userText.toLowerCase().trim();
  let score = 0;
  let signals_found = [];

  for (const [type, keywords] of Object.entries(SIGNALS)) {
    if (!keywords) continue;
    for (const kw of keywords) {
      if (t.includes(kw)) {
        score += SCORE_MAP[type];
        signals_found.push({ type, keyword: kw });
        break; // one match per category
      }
    }
  }

  // Repeat signal: user asked same question again = penalty
  if (previousUserText) {
    const similarity = roughSimilarity(t, previousUserText.toLowerCase());
    if (similarity > 0.7) {
      score -= 0.8;
      signals_found.push({ type: 'repeat_signal', similarity });
    }
  }

  return {
    score: Math.max(-1, Math.min(1, score)),
    signals: signals_found,
    sentiment: score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral',
  };
}

function roughSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

// ─────────────────────────────────────────────────────────────
// PREFERENCE VECTOR
// Soft weights — gradient-free, stored in JSON
// Updated after every exchange with a signal
// Think of it as the model's "taste" evolving over time
// ─────────────────────────────────────────────────────────────

const PREF_FILE = './midi-preferences.json';

const DEFAULT_PREFS = {
  version: '1.0',
  totalExchanges: 0,
  totalReward: 0,
  avgReward: 0,
  // Domain preferences: how well did responses in each domain score?
  domainScores: {},
  // Velocity preferences: which intensity levels get rewarded?
  velocityBuckets: { low: 0, mid: 0, high: 0, peak: 0 },
  // Response length preference (in words)
  preferredLength: { sum: 0, count: 0, avg: 20 },
  // Rewarded exchange pairs (compressed) — up to 100
  positiveExamples: [],
  // Penalised exchange pairs — up to 100
  negativeExamples: [],
  updatedAt: null,
};

export class PreferenceVector {
  constructor(path = PREF_FILE) {
    this.path = path;
    this.prefs = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.path)) {
        return JSON.parse(fs.readFileSync(this.path, 'utf8'));
      }
    } catch {}
    return { ...DEFAULT_PREFS };
  }

  save() {
    this.prefs.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.path, JSON.stringify(this.prefs, null, 2));
  }

  update(exchange, signal, midiEvent) {
    const { score } = signal;
    const p = this.prefs;

    p.totalExchanges++;
    p.totalReward += score;
    p.avgReward = p.totalReward / p.totalExchanges;

    // Update domain score
    const domain = midiEvent?.domain || 'UNKNOWN';
    if (!p.domainScores[domain]) p.domainScores[domain] = { sum: 0, count: 0, avg: 0 };
    p.domainScores[domain].sum += score;
    p.domainScores[domain].count++;
    p.domainScores[domain].avg = p.domainScores[domain].sum / p.domainScores[domain].count;

    // Update velocity bucket
    const vel = midiEvent?.velocity || 64;
    const bucket = vel < 40 ? 'low' : vel < 80 ? 'mid' : vel < 110 ? 'high' : 'peak';
    p.velocityBuckets[bucket] += score;

    // Update length preference
    const wordCount = exchange.response?.split(/\s+/).length || 0;
    if (score > 0.3) {
      p.preferredLength.sum += wordCount;
      p.preferredLength.count++;
      p.preferredLength.avg = p.preferredLength.sum / p.preferredLength.count;
    }

    // Store examples (compressed)
    const example = {
      prompt: exchange.prompt?.slice(0, 100),
      response: exchange.response?.slice(0, 100),
      score,
      domain,
      ts: Date.now(),
    };

    if (score > 0.5 && p.positiveExamples.length < 100) {
      p.positiveExamples.push(example);
    }
    if (score < -0.5 && p.negativeExamples.length < 100) {
      p.negativeExamples.push(example);
    }

    this.save();
    return this.summary();
  }

  summary() {
    const p = this.prefs;
    const topDomains = Object.entries(p.domainScores)
      .sort((a, b) => b[1].avg - a[1].avg)
      .slice(0, 3)
      .map(([d, s]) => `${d}(${s.avg.toFixed(2)})`);
    return {
      exchanges: p.totalExchanges,
      avgReward: p.avgReward.toFixed(3),
      preferredLength: Math.round(p.preferredLength.avg),
      topDomains,
    };
  }

  toSystemPromptAddendum() {
    // Injects learned preferences into the system prompt automatically
    const p = this.prefs;
    const lines = [];

    if (p.preferredLength.avg > 0) {
      lines.push(`Preferred response length: ~${Math.round(p.preferredLength.avg)} words.`);
    }

    const topDomains = Object.entries(p.domainScores)
      .filter(([_, s]) => s.avg > 0.3)
      .sort((a, b) => b[1].avg - a[1].avg)
      .slice(0, 3)
      .map(([d]) => d);
    if (topDomains.length) {
      lines.push(`User responds best to: ${topDomains.join(', ')} style responses.`);
    }

    const worstDomains = Object.entries(p.domainScores)
      .filter(([_, s]) => s.avg < -0.3)
      .map(([d]) => d);
    if (worstDomains.length) {
      lines.push(`Avoid: ${worstDomains.join(', ')} style responses.`);
    }

    return lines.length ? '\nLEARNED PREFERENCES:\n' + lines.join('\n') : '';
  }
}

// ─────────────────────────────────────────────────────────────
// B. SELF-PLAY ENGINE
// Model debates itself overnight
// Instance A asks, Instance B answers, Judge scores
// No human needed — runs while you sleep
// ─────────────────────────────────────────────────────────────

export class SelfPlayEngine {
  constructor(inferenceUrl = 'http://localhost:8787', options = {}) {
    this.url = inferenceUrl;
    this.rounds = options.rounds || 20;
    this.delay = options.delay || 2000; // ms between rounds
    this.topics = options.topics || DEFAULT_TOPICS;
    this.log = [];
  }

  async _call(prompt, systemPrompt = '') {
    const res = await fetch(`${this.url}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  _judge(question, answer) {
    // Heuristic judge — replace with learned judge in v2
    let score = 0;

    // Did it answer the question? (contains question keywords)
    const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const aLower = answer.toLowerCase();
    const covered = qWords.filter(w => aLower.includes(w)).length;
    score += (covered / Math.max(qWords.length, 1)) * 0.5;

    // Is it concise? (under 50 words = good for mobile)
    const words = answer.split(/\s+/).length;
    if (words < 50) score += 0.3;
    else if (words > 150) score -= 0.3;

    // Does it use MXit compression? (has abbreviations)
    const mxitMarkers = ['u', 'r', '2', '4', 'n', 'wt', 'hw', 'bld', 'sys', 'mem'];
    const hasMxit = mxitMarkers.some(m => aLower.split(/\s+/).includes(m));
    if (hasMxit) score += 0.2;

    return Math.max(0, Math.min(1, score));
  }

  async run(onRound = null) {
    console.log(`\n◈ SELF-PLAY: starting ${this.rounds} rounds`);
    const results = [];

    for (let i = 0; i < this.rounds; i++) {
      const topic = this.topics[i % this.topics.length];

      try {
        // Instance A: generate question
        const question = await this._call(
          `Generate a short question (MXit style, under 15 words) about: ${topic}`,
          'You generate questions in MXit shorthand. Be brief and direct.'
        );

        // Instance B: answer it
        const answer = await this._call(
          question,
          `${KYRA_SYSTEM_PROMPT}\n\nFor this self-play loop, answer in MXit style. Be concise and useful.`
        );

        // Judge scores the exchange
        const score = this._judge(question, answer);

        const round = { round: i + 1, topic, question, answer, score, ts: Date.now() };
        results.push(round);
        this.log.push(round);

        if (onRound) onRound(round);
        else console.log(`  Round ${i + 1}: score=${score.toFixed(2)} | Q: ${question.slice(0, 40)}...`);

        // Save good exchanges as training examples
        if (score > 0.7) this._saveExample(round);

        await new Promise(r => setTimeout(r, this.delay));
      } catch (err) {
        console.error(`  Round ${i + 1} error:`, err.message);
      }
    }

    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
    console.log(`\n◈ SELF-PLAY complete. avg score: ${avgScore.toFixed(3)}`);
    return { results, avgScore };
  }

  _saveExample(round) {
    const file = './self-play-examples.jsonl';
    const line = JSON.stringify({
      prompt: round.question,
      completion: round.answer,
      score: round.score,
      domain: round.topic,
    }) + '\n';
    fs.appendFileSync(file, line);
  }
}

const DEFAULT_TOPICS = [
  'building a mobile AI', 'MIDI memory encoding', 'MXit compression',
  'local inference', 'community empowerment', 'Buddies Worldwide marketplace',
  'Flutter Android development', 'how to debug Node.js', 'OpenClaw AI deployment',
  'self-learning systems', 'how to make money with AI', 'Cape Town tech scene',
];

// ─────────────────────────────────────────────────────────────
// C. MEMORY CONSOLIDATION (Sleep Cycle)
// Replays the MIDI event log
// Compresses repeated patterns into anchor motifs
// Drops noise (low vel + low dur events)
// Runs idle — call this when no user is active
// ─────────────────────────────────────────────────────────────

export class ConsolidationEngine {
  constructor(bufferPath = './mxit-memory.json') {
    this.bufferPath = bufferPath;
    this.motifsPath = './mxit-motifs.json';
  }

  _loadBuffer() {
    try {
      if (fs.existsSync(this.bufferPath)) {
        return JSON.parse(fs.readFileSync(this.bufferPath, 'utf8'));
      }
    } catch {}
    return [];
  }

  _loadMotifs() {
    try {
      if (fs.existsSync(this.motifsPath)) {
        return JSON.parse(fs.readFileSync(this.motifsPath, 'utf8'));
      }
    } catch {}
    return [];
  }

  _saveMotifs(motifs) {
    fs.writeFileSync(this.motifsPath, JSON.stringify(motifs, null, 2));
  }

  // Find recurring domain sequences (like chord progressions)
  _findMotifs(events, minLen = 2, maxLen = 4) {
    const sequences = {};

    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i <= events.length - len; i++) {
        const seq = events.slice(i, i + len).map(e => e.domain).join('→');
        sequences[seq] = (sequences[seq] || 0) + 1;
      }
    }

    // Return sequences that appear 2+ times
    return Object.entries(sequences)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([seq, count]) => ({ sequence: seq, count, domains: seq.split('→') }));
  }

  // Drop noise: low velocity AND low duration = not worth keeping
  _pruneNoise(events, velThreshold = 40, durThreshold = 300) {
    const before = events.length;
    const pruned = events.filter(e =>
      e.velocity > velThreshold || e.duration > durThreshold
    );
    return { pruned, dropped: before - pruned.length };
  }

  // Compress repeated patterns into single anchor events
  _compressPatterns(events, motifs) {
    if (!motifs.length) return events;

    // For now: tag events that are part of a known motif
    // In v2: replace motif sequences with single compressed token
    return events.map(e => {
      const inMotif = motifs.some(m => m.domains.includes(e.domain));
      return inMotif ? { ...e, anchored: true } : e;
    });
  }

  async consolidate(verbose = true) {
    if (verbose) console.log('\n◈ CONSOLIDATION: sleep cycle starting...');

    const events = this._loadBuffer();
    if (!events.length) {
      if (verbose) console.log('  buffer empty — nothing to consolidate');
      return;
    }

    const existingMotifs = this._loadMotifs();

    // Step 1: Find new motifs
    const newMotifs = this._findMotifs(events);
    if (verbose) console.log(`  motifs found: ${newMotifs.length}`);

    // Step 2: Merge with existing motif bank
    const allMotifs = [...existingMotifs];
    for (const m of newMotifs) {
      const existing = allMotifs.find(e => e.sequence === m.sequence);
      if (existing) {
        existing.count += m.count; // reinforce seen patterns
      } else {
        allMotifs.push(m);
      }
    }
    // Keep top 50 motifs
    allMotifs.sort((a, b) => b.count - a.count);
    const topMotifs = allMotifs.slice(0, 50);
    this._saveMotifs(topMotifs);
    if (verbose) console.log(`  motif bank: ${topMotifs.length} patterns saved`);

    // Step 3: Prune noise from buffer
    const { pruned, dropped } = this._pruneNoise(events);
    if (verbose) console.log(`  pruned: ${dropped} low-signal events dropped`);

    // Step 4: Compress with motif tags
    const compressed = this._compressPatterns(pruned, topMotifs);

    // Step 5: Save consolidated buffer
    fs.writeFileSync(this.bufferPath, JSON.stringify(compressed, null, 2));
    if (verbose) {
      console.log(`  buffer: ${events.length} → ${compressed.length} events`);
      console.log('◈ CONSOLIDATION: complete\n');
    }

    return {
      motifsBefore: existingMotifs.length,
      motifsAfter: topMotifs.length,
      eventsBefore: events.length,
      eventsAfter: compressed.length,
      dropped,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// ORCHESTRATOR
// Ties all three systems together
// Runs reinforcement live + consolidation on idle timer
// ─────────────────────────────────────────────────────────────

export class SelfLearner {
  constructor(options = {}) {
    this.prefs = new PreferenceVector(options.prefPath);
    this.consolidation = new ConsolidationEngine(options.bufferPath);
    this.selfPlay = options.enableSelfPlay
      ? new SelfPlayEngine(options.inferenceUrl, { rounds: options.selfPlayRounds || 10 })
      : null;

    this.idleTimeout = options.idleMs || 5 * 60 * 1000; // 5 min idle = consolidate
    this._idleTimer = null;
    this._lastUserText = null;
  }

  // Call this after every user message + AI response
  onExchange(userText, aiResponse, midiEvent) {
    const signal = extractSignal(userText, this._lastUserText);
    this._lastUserText = userText;

    if (signal.score !== 0) {
      const update = this.prefs.update(
        { prompt: userText, response: aiResponse },
        signal,
        midiEvent
      );
      console.log(`  ◈ learned: score=${signal.score.toFixed(2)} | ${JSON.stringify(update)}`);
    }

    // Reset idle timer
    this._resetIdleTimer();

    return signal;
  }

  // Inject learned preferences into next API call
  getSystemAddendum() {
    return this.prefs.toSystemPromptAddendum();
  }

  _resetIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      console.log('\n◈ IDLE detected — running consolidation...');
      this.consolidation.consolidate(true);
    }, this.idleTimeout);
  }

  async runSelfPlay() {
    if (!this.selfPlay) {
      console.log('Self-play not enabled. Pass enableSelfPlay: true to constructor.');
      return;
    }
    return this.selfPlay.run();
  }

  stats() {
    return {
      preferences: this.prefs.summary(),
      idleTimeoutMs: this.idleTimeout,
      selfPlayEnabled: !!this.selfPlay,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// QUICK TEST (run: node self-learning-loop.js)
// ─────────────────────────────────────────────────────────────

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('◈ SELF-LEARNING LOOP — TEST MODE\n');

  const learner = new SelfLearner({ idleMs: 5000 });

  // Simulate exchanges
  const exchanges = [
    { user: 'hw do i bld da encoder', ai: 'call encode(text, role) from midi-encoder.js', domain: 'BUILD' },
    { user: 'yes exactly thx', ai: '', domain: 'GRATITUDE' },
    { user: 'wt abt da buffer', ai: 'use MXitBuffer.push(text, role)', domain: 'QUESTION' },
    { user: 'dat wrong try again', ai: '', domain: 'NEGATION' },
    { user: 'hw does memory consolidation work', ai: 'during idle it replays events finds motifs drops noise', domain: 'QUESTION' },
    { user: 'k thx makes sense', ai: '', domain: 'AFFIRMATION' },
  ];

  for (const ex of exchanges) {
    const signal = learner.onExchange(ex.user, ex.ai, { domain: ex.domain, velocity: 64 });
    console.log(`  "${ex.user}" → signal: ${signal.sentiment} (${signal.score.toFixed(2)})`);
  }

  console.log('\n◈ STATS:', JSON.stringify(learner.stats(), null, 2));
  console.log('\n◈ SYSTEM ADDENDUM:', learner.getSystemAddendum() || '(not enough data yet)');
}
