#!/usr/bin/env node
'use strict';
/**
 * rekts-to-denylist — de.fi REKT Database -> MainStreet known-bad enrichment
 * =========================================================================
 * Pulls de.fi's `rekts` endpoint (all DeFi hacks/exploits) and extracts the
 * scam/exploit addresses, normalised + deduped, into a denylist the MainStreet
 * known-bad loader can merge alongside OFAC + eth-labels + ScamSniffer.
 *
 * TWO HARD GATES (fail-closed -- the CoinGecko "free != commercial" lesson):
 *   1. PAID  : de.fi has NO free tier; each `rekts` call costs credits. Needs DEFI_API_KEY.
 *   2. LICENSE: de.fi's docs state NO commercial-redistribution terms. Do NOT ingest into a
 *      commercial product until commercial use is confirmed with info@de.fi. This script
 *      REFUSES to hit the live API unless DEFI_LICENSE_OK=1 (your explicit "license confirmed").
 *
 * Usage:
 *   node scripts/rekts-to-denylist.js --dry-run            # offline mock, prints shape + self-test (N/N)
 *   DEFI_API_KEY=... DEFI_LICENSE_OK=1 \
 *     node scripts/rekts-to-denylist.js --out known-bad-defi.json [--max-pages 20]
 *
 * Output row: { address, source:'de.fi/rekt', category, incident, chain, addedAt }
 * Adapt the row shape to MainStreet's known-bad loader if it differs.
 */

const fs = require('fs');

const API_URL = process.env.DEFI_API_URL || 'https://public-api.de.fi/graphql';
const API_KEY = process.env.DEFI_API_KEY || '';
const LICENSE_OK = process.env.DEFI_LICENSE_OK === '1';

const ADDR_RE = /^0x[0-9a-f]{40}$/;
const norm = (a) => (typeof a === 'string' ? a.trim().toLowerCase() : '');
const isAddr = (a) => ADDR_RE.test(norm(a));

// ---- extraction: pull every address a REKT incident implicates ----------
// A rekt row shape varies; we defensively scan the known address-bearing fields
// (scammer/attacker, the exploited token/contract, funding source) + any nested
// address-looking string. Fail-open on shape (extract what we can), fail-closed
// on validity (only keep well-formed 0x addresses).
function extractRows(rekt) {
  const out = [];
  const category = rekt.category || rekt.type || 'defi-exploit';
  const incident = rekt.project || rekt.name || rekt.title || 'unknown';
  const chain = rekt.chain || rekt.network || null;
  const push = (addr, role) => {
    if (isAddr(addr)) out.push({ address: norm(addr), source: 'de.fi/rekt', category: `${category}:${role}`, incident, chain });
  };
  push(rekt.scammerAddress, 'scammer');
  push(rekt.attacker, 'attacker');
  push(rekt.tokenAddress, 'token');
  push(rekt.contract, 'contract');
  push(rekt.fundedBy, 'funder');
  for (const a of (rekt.addresses || [])) push(a, 'listed');
  return out;
}

function dedupe(rows) {
  const seen = new Map(); // address -> row (first wins, but merge roles)
  for (const r of rows) {
    if (seen.has(r.address)) {
      const prev = seen.get(r.address);
      if (!prev.category.includes(r.category)) prev.category += ',' + r.category;
    } else {
      seen.set(r.address, { ...r });
    }
  }
  const at = new Date().toISOString();
  return [...seen.values()].map((r) => ({ ...r, addedAt: at }));
}

// ---- live pull (gated) ---------------------------------------------------
async function fetchRektsPage(page, pageSize = 50) {
  // de.fi API is GraphQL + credit-metered. Endpoint/field names may need tuning
  // against docs.de.fi/api/api.md (the `rekts` query). Kept configurable + isolated.
  const query = `query Rekts($page:Int!,$size:Int!){ rekts(page:$page,pageSize:$size){ items{ project category chain scammerAddress tokenAddress addresses } pageInfo{ hasNextPage } } }`;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ query, variables: { page, size: pageSize } }),
  });
  if (!res.ok) throw new Error(`de.fi API ${res.status} ${res.statusText}`);
  const json = await res.json();
  const d = json?.data?.rekts;
  if (!d) throw new Error('unexpected de.fi response shape (check docs.de.fi/api/api.md)');
  return { items: d.items || [], hasNext: !!d.pageInfo?.hasNextPage };
}

async function pullAll(maxPages) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const { items, hasNext } = await fetchRektsPage(page);
    for (const it of items) all.push(...extractRows(it));
    process.stderr.write(`  page ${page}: +${items.length} incidents (${all.length} addr rows)\n`);
    if (!hasNext) break;
  }
  return dedupe(all);
}

// ---- dry-run mock (offline, deterministic) -------------------------------
const MOCK = [
  { project: 'AcmeSwap', category: 'exit-scam', chain: 'base', scammerAddress: '0xABCdeF0000000000000000000000000000000001', tokenAddress: '0x00000000000000000000000000000000dEAdBeeF' },
  { project: 'Ronin-style', category: 'bridge-exploit', chain: 'eth', attacker: '0xABCDEF0000000000000000000000000000000001', addresses: ['0x1111111111111111111111111111111111111111', 'not-an-address'] },
];

// ---- self-test (N/N, offline) --------------------------------------------
function selfTest() {
  let n = 0, ok = 0;
  const t = (name, cond) => { n++; if (cond) ok++; else console.error('  FAIL:', name); };
  const rows = dedupe(MOCK.flatMap(extractRows));
  t('extracts valid addresses', rows.length === 3); // scammer, token, attacker(=scammer, deduped)+listed
  t('rejects malformed address', !rows.some((r) => r.address === 'not-an-address'));
  t('normalises to lowercase', rows.every((r) => r.address === r.address.toLowerCase()));
  t('dedupes cross-incident (same attacker=scammer)', new Set(rows.map((r) => r.address)).size === rows.length);
  t('merges roles on dedupe', rows.find((r) => r.address === '0xabcdef0000000000000000000000000000000001')?.category.includes('scammer') );
  t('stamps addedAt', rows.every((r) => typeof r.addedAt === 'string'));
  t('tags source', rows.every((r) => r.source === 'de.fi/rekt'));
  console.log(`\n[self-test] ${ok}/${n} checks passed`);
  return ok === n;
}

// ---- main ----------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const outIdx = argv.indexOf('--out');
  const out = outIdx > -1 ? argv[outIdx + 1] : null;
  const mpIdx = argv.indexOf('--max-pages');
  const maxPages = mpIdx > -1 ? parseInt(argv[mpIdx + 1]) : 20;

  if (dryRun) {
    const rows = dedupe(MOCK.flatMap(extractRows));
    console.log('DRY-RUN (offline mock, no API call). Output shape:');
    console.log(JSON.stringify(rows, null, 2));
    const passed = selfTest();
    console.log('\nTo run for real: confirm the commercial licence with info@de.fi, then');
    console.log('  DEFI_API_KEY=... DEFI_LICENSE_OK=1 node scripts/rekts-to-denylist.js --out known-bad-defi.json');
    process.exit(passed ? 0 : 1);
  }

  // live path -- both gates must be open
  if (!API_KEY) { console.error('REFUSED: DEFI_API_KEY not set (de.fi is credit-metered, no free tier). Get a key: info@de.fi'); process.exit(2); }
  if (!LICENSE_OK) {
    console.error('REFUSED: DEFI_LICENSE_OK is not 1.');
    console.error('  de.fi docs state NO commercial-redistribution terms. Confirm commercial use with info@de.fi FIRST,');
    console.error('  then set DEFI_LICENSE_OK=1 to acknowledge. (The CoinGecko free!=commercial trap — fail-closed.)');
    process.exit(2);
  }

  console.error(`Pulling de.fi rekts (max ${maxPages} pages) from ${API_URL} ...`);
  const rows = await pullAll(maxPages);
  console.error(`\n${rows.length} unique known-bad addresses extracted.`);
  const payload = { source: 'de.fi/rekt', generatedAt: new Date().toISOString(), count: rows.length, addresses: rows };
  if (out) { fs.writeFileSync(out, JSON.stringify(payload, null, 2)); console.error(`-> ${out}`); }
  else { console.log(JSON.stringify(payload, null, 2)); }
  console.error('Next: merge into the MainStreet known-bad loader (dedupe vs OFAC/eth-labels/ScamSniffer).');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
