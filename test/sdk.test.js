// SDK tests — pure unit tests (mocked fetch).
// Run: node --test test/sdk.test.js

const test = require('node:test');
const assert = require('node:assert/strict');

// Mock fetch BEFORE requiring the SDK
const calls = [];
let mockResponse = { ok: true, status: 200, json: async () => ({}), text: async () => '' };
globalThis.fetch = async (url, init) => { calls.push({ url, init }); return mockResponse; };

const ms = require('../sdk');

test('sdk: configure() changes origin', () => {
  ms.configure({ origin: 'https://test.example' });
  assert.equal(ms.origin(), 'https://test.example');
  ms.configure({ origin: 'https://avisradar-production.up.railway.app' });
});

test('sdk: score() rejects invalid address', async () => {
  await assert.rejects(() => ms.score('not-an-address'), /invalid address/);
  await assert.rejects(() => ms.score('0x123'), /invalid address/);
});

test('sdk: score() lowercases address', async () => {
  calls.length = 0;
  mockResponse = { ok: true, json: async () => ({ score: 50 }), text: async () => '' };
  await ms.score('0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9');
  assert.match(calls[0].url, /\/api\/agent\/score\/0xac3ca7c5d3cdd7702fd08f9c4c28daa22296ada9$/);
});

test('sdk: score(addr, {live:true}) appends ?live=1', async () => {
  calls.length = 0;
  await ms.score('0x' + 'a'.repeat(40), { live: true });
  assert.match(calls[0].url, /\?live=1$/);
});

test('sdk: leaderboard builds query string', async () => {
  calls.length = 0;
  mockResponse = { ok: true, json: async () => ({ results: [] }), text: async () => '' };
  await ms.leaderboard({ limit: 50, network: 'solana', sparkline: true });
  assert.match(calls[0].url, /limit=50/);
  assert.match(calls[0].url, /network=solana/);
  assert.match(calls[0].url, /sparkline=1/);
});

test('sdk: compare requires both addresses valid', async () => {
  await assert.rejects(() => ms.compare('bad', '0x' + 'b'.repeat(40)), /invalid address/);
  await assert.rejects(() => ms.compare('0x' + 'a'.repeat(40), 'bad'), /invalid address/);
});

test('sdk: vet() throws on low score', async () => {
  mockResponse = { ok: true, json: async () => ({ score: 10, resourcePath: 'x', health: { alive: true } }), text: async () => '' };
  await assert.rejects(() => ms.vet('0x' + 'a'.repeat(40), { minScore: 30 }), /score 10 < 30/);
});

test('sdk: vet() throws on dead endpoint', async () => {
  mockResponse = { ok: true, json: async () => ({ score: 50, resourcePath: 'x', health: { alive: false } }), text: async () => '' };
  await assert.rejects(() => ms.vet('0x' + 'a'.repeat(40)), /endpoint unreachable/);
});

test('sdk: vet() throws when no service URL', async () => {
  mockResponse = { ok: true, json: async () => ({ score: 50, resourcePath: null, health: { alive: true } }), text: async () => '' };
  await assert.rejects(() => ms.vet('0x' + 'a'.repeat(40)), /no service URL/);
});

test('sdk: vet() passes on healthy agent', async () => {
  mockResponse = { ok: true, json: async () => ({ score: 70, resourcePath: 'https://x.com', health: { alive: true } }), text: async () => '' };
  const r = await ms.vet('0x' + 'a'.repeat(40));
  assert.equal(r.score, 70);
});

test('sdk: search() rejects 1-char queries', async () => {
  await assert.rejects(() => ms.search('a'), /at least 2 chars/);
});

test('sdk: claimBadge() requires all 3 fields', async () => {
  await assert.rejects(() => ms.claimBadge({ address: '0x' + 'a'.repeat(40) }), /requires/);
  await assert.rejects(() => ms.claimBadge({ message: 'x', signature: 'y' }), /requires/);
});

test('sdk: claimBadge() posts JSON body', async () => {
  calls.length = 0;
  mockResponse = { ok: true, json: async () => ({ ok: true, badgeUrl: 'x', embed: 'y' }), text: async () => '' };
  await ms.claimBadge({ address: '0x' + 'a'.repeat(40), message: 'hi', signature: '0x' + 'b'.repeat(130) });
  assert.equal(calls[0].init.method, 'POST');
  assert.match(calls[0].init.headers['Content-Type'], /application\/json/);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.message, 'hi');
});

test('sdk: HTTP error throws with status', async () => {
  mockResponse = { ok: false, status: 500, json: async () => ({}), text: async () => 'server down' };
  await assert.rejects(() => ms.me(), /500.*server down/);
});
