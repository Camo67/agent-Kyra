/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           MIDI × MXIT AI — GRAMMAR SPECIFICATION v1.0       ║
 * ║                                                              ║
 * ║  This is the foundational contract.                          ║
 * ║  Every module in the system must import and obey this file.  ║
 * ║  Do not change values once the model is trained on them.     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MIDI has 4 core properties we repurpose:
 *   CHANNEL  → WHO is speaking / what layer
 *   PITCH    → WHAT the message is about (semantic category)
 *   VELOCITY → HOW strongly (intensity / urgency / emotion)
 *   DURATION → HOW LONG to remember it (importance weight)
 *
 * Together they form a compact event token:
 *   { ch, pitch, vel, dur } = one thought unit
 */

// ─────────────────────────────────────────────
// CHANNEL (0–15): Speaker / Cognitive Layer
// Think of these as instrument tracks in a DAW
// ─────────────────────────────────────────────
export const CHANNEL = {
  USER:        0,   // Human input
  ASSISTANT:   1,   // AI response
  SYSTEM:      2,   // Instructions / config
  EMOTION:     3,   // Sentiment layer (runs parallel)
  ENTITY:      4,   // Named things: people, places, objects
  INTENT:      5,   // What the user is trying to DO
  MEMORY_REF:  6,   // Explicit reference to past context
  ERROR:       7,   // Failures, misunderstandings
  // 8–15 reserved for future layers
};

export const CHANNEL_NAME = Object.fromEntries(
  Object.entries(CHANNEL).map(([k, v]) => [v, k])
);

// ─────────────────────────────────────────────
// PITCH (36–107): Semantic Category
// 6 octaves, 12 notes each = 72 slots
// Mapped to topic families, not random hashes
// ─────────────────────────────────────────────
export const PITCH_RANGE = { MIN: 36, MAX: 107 };

// Each octave = a domain
export const PITCH_DOMAIN = {
  //  Octave 2 (36–47): Social / Relational
  GREETING:     36,  // hi, hello, sup
  FAREWELL:     37,  // bye, l8r, cya
  AFFIRMATION:  38,  // yes, k, agreed
  NEGATION:     39,  // no, nope, disagree
  GRATITUDE:    40,  // ty, thx
  APOLOGY:      41,  // sry, my bad
  REQUEST:      42,  // ask for something
  OFFER:        43,  // give / provide
  // 44–47 reserved

  //  Octave 3 (48–59): Information
  QUESTION:     48,  // asking for info
  ANSWER:       49,  // providing info
  STATEMENT:    50,  // factual claim
  CORRECTION:   51,  // fixing wrong info
  DEFINITION:   52,  // what is X
  EXAMPLE:      53,  // show me / for instance
  LIST:         54,  // enumeration
  SUMMARY:      55,  // recap / tldr
  // 56–59 reserved

  //  Octave 4 (60–71): Action / Task
  COMMAND:      60,  // do X
  CONFIRM:      61,  // confirm action
  CANCEL:       62,  // stop / abort
  BUILD:        63,  // create / make / code
  FIX:          64,  // debug / repair
  SEARCH:       65,  // find / look up
  SEND:         66,  // send / share
  SAVE:         67,  // store / keep
  // 68–71 reserved

  //  Octave 5 (72–83): Emotion / State
  JOY:          72,
  FRUSTRATION:  73,
  CONFUSION:    74,
  URGENCY:      75,
  EXCITEMENT:   76,
  CONCERN:      77,
  CURIOSITY:    78,
  NEUTRAL:      79,
  // 80–83 reserved

  //  Octave 6 (84–95): Meta / System
  INIT:         84,  // start of conversation
  RESET:        85,  // clear memory
  MODE_SWITCH:  86,  // change behaviour
  FEEDBACK:     87,  // rating / reaction
  CONTEXT_REF:  88,  // "earlier you said..."
  INJECT:       89,  // system prompt override
  // 90–95 reserved

  //  Octave 7 (96–107): Domain-Specific (extensible)
  TECH:         96,  // code / software
  FINANCE:      97,
  HEALTH:       98,
  CREATIVE:     99,
  COMMUNITY:    100,
  LOCATION:     101,
  TIME:         102,
  // 103–107 reserved
};

export const PITCH_NAME = Object.fromEntries(
  Object.entries(PITCH_DOMAIN).map(([k, v]) => [v, k])
);

/**
 * Classify a compressed message into a pitch value.
 * Simple keyword heuristic — replace with ML classifier in v2.
 */
export function classifyPitch(compressedText) {
  const t = compressedText.toLowerCase();

  // Social
  if (/\b(hi|hello|hw r u|sup|yo|ola)\b/.test(t)) return PITCH_DOMAIN.GREETING;
  if (/\b(bye|cya|l8r|ttyl|gtg)\b/.test(t)) return PITCH_DOMAIN.FAREWELL;
  if (/\b(yes|ya|k|yep|agreed|correct)\b/.test(t)) return PITCH_DOMAIN.AFFIRMATION;
  if (/\b(no|nope|nah|wrong|incorrect)\b/.test(t)) return PITCH_DOMAIN.NEGATION;
  if (/\b(ty|thx|gr8|appreciate)\b/.test(t)) return PITCH_DOMAIN.GRATITUDE;
  if (/\b(sry|my bad|apologies|sorry)\b/.test(t)) return PITCH_DOMAIN.APOLOGY;

  // Information
  if (/\?/.test(t)) return PITCH_DOMAIN.QUESTION;
  if (/\b(wt is|define|meaning of|explain)\b/.test(t)) return PITCH_DOMAIN.DEFINITION;
  if (/\b(4 example|eg|such as|like)\b/.test(t)) return PITCH_DOMAIN.EXAMPLE;
  if (/\b(tldr|summary|recap|in short)\b/.test(t)) return PITCH_DOMAIN.SUMMARY;

  // Action / Task
  if (/\b(bld|mk|crt|code|write|generate)\b/.test(t)) return PITCH_DOMAIN.BUILD;
  if (/\b(fix|debug|repair|broke|error|bug)\b/.test(t)) return PITCH_DOMAIN.FIX;
  if (/\b(find|search|look|get|fetch)\b/.test(t)) return PITCH_DOMAIN.SEARCH;
  if (/\b(send|share|forward|post)\b/.test(t)) return PITCH_DOMAIN.SEND;
  if (/\b(save|store|remember|keep)\b/.test(t)) return PITCH_DOMAIN.SAVE;

  // Emotion
  if (/(!{2,}|so excited|cant wait|amazing)/.test(t)) return PITCH_DOMAIN.EXCITEMENT;
  if (/(wtf|ugh|annoying|frustrated|angry)/.test(t)) return PITCH_DOMAIN.FRUSTRATION;
  if (/(confused|dont get|huh|lost|idk)/.test(t)) return PITCH_DOMAIN.CONFUSION;
  if (/(urgent|asap|now|hurry|quick)/.test(t)) return PITCH_DOMAIN.URGENCY;
  if (/(worried|concerned|scared|afraid)/.test(t)) return PITCH_DOMAIN.CONCERN;
  if (/(interesting|curious|wonder|y does)/.test(t)) return PITCH_DOMAIN.CURIOSITY;

  // Domain-specific
  if (/(code|sys|api|dev|app|bug|deploy|server)/.test(t)) return PITCH_DOMAIN.TECH;
  if (/(money|cost|price|pay|budget|revenue)/.test(t)) return PITCH_DOMAIN.FINANCE;
  if (/(feel|pain|sick|health|body|mental)/.test(t)) return PITCH_DOMAIN.HEALTH;
  if (/(community|ociu|bonteheuwel|youth|ppl)/.test(t)) return PITCH_DOMAIN.COMMUNITY;
  if (/(design|art|music|creative|write|story)/.test(t)) return PITCH_DOMAIN.CREATIVE;

  // Default fallback
  if (t.length > 0) return PITCH_DOMAIN.STATEMENT;
  return PITCH_DOMAIN.NEUTRAL;
}

// ─────────────────────────────────────────────
// VELOCITY (0–127): Intensity / Urgency
// ─────────────────────────────────────────────
export const VELOCITY = {
  SILENT:    0,    // no signal
  WHISPER:   20,   // low priority, background
  SOFT:      40,   // calm, passive
  NORMAL:    64,   // default conversation
  EMPHASIS:  90,   // important
  URGENT:    110,  // high priority
  PEAK:      127,  // maximum intensity
};

/**
 * Calculate velocity from raw text signals
 */
export function calcVelocity(rawText) {
  const bangs   = (rawText.match(/!/g) || []).length;
  const asks    = (rawText.match(/\?/g) || []).length;
  const allcaps = (rawText.match(/\b[A-Z]{2,}\b/g) || []).length;
  const ellipsis = (rawText.match(/\.\.\./g) || []).length;

  let v = VELOCITY.NORMAL;
  v += bangs * 15;
  v += asks * 8;
  v += allcaps * 12;
  v -= ellipsis * 5; // trailing off = softer

  return Math.max(VELOCITY.WHISPER, Math.min(VELOCITY.PEAK, Math.round(v)));
}

// ─────────────────────────────────────────────
// DURATION (ms): Memory Persistence Weight
// How long this event influences future context
// ─────────────────────────────────────────────
export const DURATION = {
  FLASH:     100,   // throwaway (filler words)
  SHORT:     400,   // quick exchange
  NORMAL:    800,   // standard message
  EXTENDED:  2000,  // important context
  ANCHOR:    5000,  // must retain (names, goals, decisions)
};

/**
 * Calculate duration from message characteristics
 */
export function calcDuration(rawText, pitch) {
  const words = rawText.trim().split(/\s+/).length;
  let base = DURATION.SHORT + words * 80;

  // Anchor important categories
  const anchored = [
    PITCH_DOMAIN.COMMAND, PITCH_DOMAIN.BUILD, PITCH_DOMAIN.FIX,
    PITCH_DOMAIN.SAVE, PITCH_DOMAIN.INIT, PITCH_DOMAIN.CONTEXT_REF
  ];
  if (anchored.includes(pitch)) base *= 2;

  // Shorten throwaway social
  const ephemeral = [
    PITCH_DOMAIN.GREETING, PITCH_DOMAIN.FAREWELL,
    PITCH_DOMAIN.AFFIRMATION, PITCH_DOMAIN.NEGATION
  ];
  if (ephemeral.includes(pitch)) base = DURATION.FLASH;

  return Math.min(DURATION.ANCHOR, Math.round(base));
}

// ─────────────────────────────────────────────
// NOTE NAMES (for human-readable output)
// ─────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function pitchToNoteName(pitch) {
  const oct = Math.floor(pitch / 12) - 1;
  return NOTE_NAMES[pitch % 12] + oct;
}

// ─────────────────────────────────────────────
// EVENT BUILDER
// The single function all modules call
// Returns a complete, normalised MIDI event
// ─────────────────────────────────────────────
export function buildEvent(rawText, compressedText, role = 'user') {
  const channel  = CHANNEL[role.toUpperCase()] ?? CHANNEL.USER;
  const pitch    = classifyPitch(compressedText);
  const velocity = calcVelocity(rawText);
  const duration = calcDuration(rawText, pitch);
  const noteName = pitchToNoteName(pitch);
  const domain   = PITCH_NAME[pitch] ?? 'UNKNOWN';

  return {
    channel,
    pitch,
    velocity,
    duration,
    noteName,
    domain,        // human-readable semantic label
    role,
    raw: rawText,
    compressed: compressedText,
    ts: Date.now(),
  };
}

// ─────────────────────────────────────────────
// SERIALISER
// Compact token format for API context injection
// Format: [R ch:N pit:NN dom:DOMAIN vel:VVV dur:DDDDms] text
// ─────────────────────────────────────────────
export function serialiseEvent(event) {
  return `[${event.role[0].toUpperCase()} ch:${event.channel} pit:${event.pitch} dom:${event.domain} vel:${event.velocity} dur:${event.duration}ms] ${event.compressed}`;
}

export function serialiseLog(events) {
  return events.map(serialiseEvent).join('\n');
}

// ─────────────────────────────────────────────
// GRAMMAR SUMMARY (for debugging / docs)
// ─────────────────────────────────────────────
export const GRAMMAR_VERSION = '1.0.0';

export function grammarSummary() {
  return {
    version: GRAMMAR_VERSION,
    channels: Object.keys(CHANNEL).length,
    pitchDomains: Object.keys(PITCH_DOMAIN).length,
    pitchRange: PITCH_RANGE,
    velocityLevels: Object.keys(VELOCITY).length,
    durationLevels: Object.keys(DURATION).length,
    tokenFormat: '[R ch:N pit:NN dom:DOMAIN vel:VVV dur:DDDDms] compressed_text',
  };
}
