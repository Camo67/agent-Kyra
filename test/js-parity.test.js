import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { mxitCompress, mxitDecompress } from "../mxit-compressor.js";
import { encode, logToContext } from "../midi-encoder.js";
import MXitBuffer from "../mxit-buffer.js";

const fixtures = JSON.parse(
  await readFile(new URL("../fixtures/parity-fixtures.json", import.meta.url), "utf8")
);

test("compression fixtures stay stable", () => {
  for (const sample of fixtures.compressionSamples) {
    assert.deepEqual(mxitCompress(sample.input), sample.compressed);
    assert.equal(mxitDecompress(sample.compressed.text), sample.decompressed);
  }
});

test("encoding fixtures stay stable", () => {
  const encoded = fixtures.encodingSamples.map((sample) => encode(sample.input, sample.role));

  for (let index = 0; index < encoded.length; index += 1) {
    const { ts: _ignoredTs, ...stableEvent } = encoded[index];
    assert.deepEqual(stableEvent, fixtures.encodingSamples[index].event);
  }

  assert.equal(logToContext(encoded), fixtures.logContext);
});

test("buffer pruning prefers lowest-duration events", () => {
  const buffer = new MXitBuffer({ maxEvents: fixtures.bufferPruneCase.maxEvents });

  for (const input of fixtures.bufferPruneCase.inputs) {
    buffer.push(input.text, input.role);
  }

  const stableLog = buffer.getLog().map(({ ts: _ignoredTs, ...event }) => event);
  assert.deepEqual(stableLog, fixtures.bufferPruneCase.expectedLog);
  assert.equal(buffer.toContext(), fixtures.bufferPruneCase.expectedContext);

  const stats = buffer.stats();
  assert.equal(stats.count, fixtures.bufferPruneCase.expectedStats.count);
  assert.equal(stats.maxEvents, fixtures.bufferPruneCase.expectedStats.maxEvents);
  assert.equal(stats.dominantDomain, fixtures.bufferPruneCase.expectedStats.dominantDomain);
  assert.equal(stats.avgVelocity, fixtures.bufferPruneCase.expectedStats.avgVelocity);
  assert.equal(typeof stats.oldestTs, "number");
  assert.equal(typeof stats.newestTs, "number");
});
