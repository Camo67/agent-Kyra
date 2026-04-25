import { pathToFileURL } from "node:url";

const ABBREVIATIONS = Object.freeze([
  { source: "thank you", target: "ty" },
  { source: "going", target: "goin" },
  { source: "because", target: "coz" },
  { source: "tonight", target: "2nyt" },
  { source: "tomorrow", target: "2moro" },
  { source: "today", target: "2day" },
  { source: "before", target: "b4" },
  { source: "later", target: "l8r" },
  { source: "please", target: "plz" },
  { source: "thanks", target: "thx" },
  { source: "sorry", target: "sry" },
  { source: "okay", target: "k" },
  { source: "great", target: "gr8" },
  { source: "where", target: "whr" },
  { source: "when", target: "wen" },
  { source: "what", target: "wt" },
  { source: "why", target: "y" },
  { source: "how", target: "hw" },
  { source: "your", target: "ur" },
  { source: "they", target: "dey" },
  { source: "them", target: "dem" },
  { source: "we", target: "we" },
  { source: "know", target: "knw" },
  { source: "think", target: "thnk" },
  { source: "want", target: "wnt" },
  { source: "have", target: "hv" },
  { source: "make", target: "mk" },
  { source: "build", target: "bld" },
  { source: "create", target: "crt" },
  { source: "need", target: "nd" },
  { source: "system", target: "sys" },
  { source: "memory", target: "mem" },
  { source: "model", target: "mdl" },
  { source: "local", target: "lcl" },
  { source: "message", target: "msg" },
  { source: "information", target: "info" },
  { source: "with", target: "w/" },
  { source: "this", target: "dis" },
  { source: "that", target: "dat" },
  { source: "and", target: "n" },
  { source: "you", target: "u" },
  { source: "are", target: "r" },
  { source: "too", target: "2also" },
  { source: "ate", target: "8" },
  { source: "for", target: "4" },
  { source: "to", target: "2" },
  { source: "the", target: "da" },
  { source: "am", target: "m" }
]);

const SORTED_ABBREVIATIONS = [...ABBREVIATIONS].sort((left, right) => {
  return (
    right.source.length - left.source.length ||
    right.target.length - left.target.length
  );
});

const REVERSE_ABBREVIATIONS = [...new Map(
  SORTED_ABBREVIATIONS.map(({ source, target }) => [target, source])
).entries()]
  .map(([target, source]) => ({ source: target, target: source }))
  .sort((left, right) => {
    return (
      right.source.length - left.source.length ||
      right.target.length - left.target.length
    );
  });

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholePhrase(input, source, target) {
  const pattern = new RegExp(
    `(?<![a-z0-9])${escapeRegex(source)}(?![a-z0-9])`,
    "g"
  );
  return input.replace(pattern, target);
}

function tidySpacing(input) {
  return input
    .replace(/\s+([?!.,;:])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function applyAbbreviations(input, table) {
  return table.reduce((result, entry) => {
    return replaceWholePhrase(result, entry.source, entry.target);
  }, input);
}

export function mxitCompress(rawText = "") {
  const original = String(rawText ?? "");
  const working = tidySpacing(original.toLowerCase());
  const text = applyAbbreviations(working, SORTED_ABBREVIATIONS);
  const originalLength = working.length;
  const compressedLength = text.length;
  const ratio = originalLength === 0
    ? 1
    : Number((compressedLength / originalLength).toFixed(3));

  return {
    text,
    ratio,
    originalLength,
    compressedLength
  };
}

export function mxitDecompress(compressedText = "") {
  const working = tidySpacing(String(compressedText ?? "").toLowerCase());
  return applyAbbreviations(working, REVERSE_ABBREVIATIONS);
}

export { ABBREVIATIONS };

const isDirectRun = Boolean(process.argv[1]) &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  const sample = "I am going to build the system tomorrow because I need to know how it works";
  const compressed = mxitCompress(sample);

  console.assert(
    compressed.text === "i m goin 2 bld da sys 2moro coz i nd 2 knw hw it works",
    `Unexpected compressed output: ${compressed.text}`
  );
  console.assert(
    compressed.compressedLength < compressed.originalLength,
    "Compression should shorten the sample"
  );

  const decompressed = mxitDecompress(compressed.text);
  console.assert(
    decompressed.includes("tomorrow") && decompressed.includes("system"),
    `Unexpected decompressed output: ${decompressed}`
  );

  console.log("mxit-compressor.js tests passed");
}
