/**
 * Unit tests for sync-core.mjs's retry/backoff and concurrency-limiting
 * helpers (node:test, no browser needed).
 *
 * sync-core.mjs's main() does real fs writes and real GitHub API calls, so
 * it isn't imported/exercised directly here. These tests only cover the
 * exported pure(ish) helpers — backoffDelayMs, fetchWithRetry, createLimiter
 * — with an injected fetch/sleep, which is what actually changed in PR-C2
 * (retry/backoff for transient ghFetch() failures, and a concurrency cap on
 * syncGhDir()'s recursive fan-out). Importing the module is safe: main() is
 * gated behind an `isMainModule` check so it never runs as an import side
 * effect (see the bottom of sync-core.mjs).
 *
 * Run: node --test tests/sync-core.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  backoffDelayMs,
  fetchWithRetry,
  createLimiter,
} from '../SLASHED-for-WP/admin-app/scripts/sync-core.mjs';

describe('backoffDelayMs', () => {
  test('doubles per attempt starting from baseDelayMs', () => {
    assert.equal(backoffDelayMs(0, 500), 500);
    assert.equal(backoffDelayMs(1, 500), 1000);
    assert.equal(backoffDelayMs(2, 500), 2000);
  });

  test('defaults to the module baseDelayMs when not provided', () => {
    assert.equal(backoffDelayMs(0), backoffDelayMs(0, 500));
  });
});

// Records the (ms) argument of every sleep() call instead of actually
// waiting, so retry tests run instantly regardless of backoff duration.
function recordingSleep() {
  const calls = [];
  const sleep = (ms) => { calls.push(ms); return Promise.resolve(); };
  return { sleep, calls };
}

function jsonResponse(status, headers = {}) {
  return { ok: status >= 200 && status < 300, status, headers: new Map(Object.entries(headers)) };
}

// new Map() doesn't implement the fetch Headers API's .get() case-folding,
// but the code only ever reads the exact 'x-ratelimit-remaining' key, so a
// plain Map is a sufficient stand-in here.

describe('fetchWithRetry', () => {
  test('returns immediately on a 2xx response without sleeping', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => { fetchCalls++; return jsonResponse(200); };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep });

    assert.equal(res.ok, true);
    assert.equal(fetchCalls, 1);
    assert.deepEqual(calls, []);
  });

  test('returns a plain 404 immediately without retrying (caller handles the fallback)', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => { fetchCalls++; return jsonResponse(404); };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep });

    assert.equal(res.status, 404);
    assert.equal(fetchCalls, 1);
    assert.deepEqual(calls, []);
  });

  test('returns a non-rate-limited 403 immediately without retrying', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => { fetchCalls++; return jsonResponse(403, { 'x-ratelimit-remaining': '10' }); };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep });

    assert.equal(res.status, 403);
    assert.equal(fetchCalls, 1);
    assert.deepEqual(calls, []);
  });

  test('retries a rate-limit-exhausted 403 and succeeds once the limit clears', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => {
      fetchCalls++;
      if (fetchCalls < 3) return jsonResponse(403, { 'x-ratelimit-remaining': '0' });
      return jsonResponse(200);
    };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep, maxAttempts: 3 });

    assert.equal(res.ok, true);
    assert.equal(fetchCalls, 3);
    assert.deepEqual(calls, [500, 1000]); // backoff before attempts 2 and 3
  });

  test('retries a 5xx response with exponential backoff', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => {
      fetchCalls++;
      return fetchCalls < 2 ? jsonResponse(503) : jsonResponse(200);
    };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep, maxAttempts: 3, baseDelayMs: 100 });

    assert.equal(res.ok, true);
    assert.equal(fetchCalls, 2);
    assert.deepEqual(calls, [100]);
  });

  test('gives up after maxAttempts and returns the last non-ok response', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => { fetchCalls++; return jsonResponse(503); };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep, maxAttempts: 3, baseDelayMs: 10 });

    assert.equal(res.status, 503);
    assert.equal(fetchCalls, 3);
    assert.deepEqual(calls, [10, 20]); // 2 backoffs between 3 attempts
  });

  test('retries a network error (fetch throwing) and succeeds on a later attempt', async () => {
    const { sleep, calls } = recordingSleep();
    let fetchCalls = 0;
    const fetchImpl = async () => {
      fetchCalls++;
      if (fetchCalls < 2) throw new Error('ECONNRESET');
      return jsonResponse(200);
    };

    const res = await fetchWithRetry('https://example.test', {}, { fetchImpl, sleep, maxAttempts: 3, baseDelayMs: 10 });

    assert.equal(res.ok, true);
    assert.equal(fetchCalls, 2);
    assert.deepEqual(calls, [10]);
  });

  test('throws the underlying error when every attempt is a network error', async () => {
    const { sleep } = recordingSleep();
    const fetchImpl = async () => { throw new Error('ENOTFOUND'); };

    await assert.rejects(
      fetchWithRetry('https://example.test', {}, { fetchImpl, sleep, maxAttempts: 2, baseDelayMs: 1 }),
      /ENOTFOUND/,
    );
  });
});

describe('createLimiter', () => {
  test('runs all jobs to completion and returns their individual results', async () => {
    const run = createLimiter(2);
    const results = await Promise.all([1, 2, 3, 4].map((n) => run(async () => n * 10)));
    assert.deepEqual(results, [10, 20, 30, 40]);
  });

  test('never runs more than `limit` jobs concurrently', async () => {
    const limit = 3;
    const run = createLimiter(limit);
    let active = 0;
    let maxActive = 0;

    const job = () => new Promise((resolve) => {
      active++;
      maxActive = Math.max(maxActive, active);
      setTimeout(() => { active--; resolve(); }, 5);
    });

    await Promise.all(Array.from({ length: 10 }, () => run(job)));

    assert.ok(maxActive <= limit, `expected max concurrency <= ${limit}, saw ${maxActive}`);
    assert.equal(maxActive, limit); // with 10 jobs and limit 3, the cap should actually be hit
  });

  test('a rejected job does not stall the rest of the queue', async () => {
    const run = createLimiter(2);
    const jobs = [
      run(async () => 'a'),
      run(async () => { throw new Error('job failed'); }),
      run(async () => 'c'),
    ];

    const results = await Promise.allSettled(jobs);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[0].value, 'a');
    assert.equal(results[1].status, 'rejected');
    assert.equal(results[2].status, 'fulfilled');
    assert.equal(results[2].value, 'c');
  });
});
