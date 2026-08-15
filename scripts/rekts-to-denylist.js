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
//
// ⚠️ SOURCE UNIQUE DE VERITE, mesure du 2026-08-15. extractRows lisait SIX champs
// (scammer/attacker/token/contract/funder + addresses[]) tandis que la requete GraphQL live n'en
// selectionnait que TROIS (scammerAddress, tokenAddress, addresses). Le MOCK du --dry-run porte un
// `attacker`, donc le self-test prouvait l'extraction de `attacker` EN VERT sur un champ que la requete
// reelle ne demande jamais: chaque incident reel voyait son adresse d'attaquant/contrat/financeur
// silencieusement DROP d'une denylist known-bad, sans un mot. La requete est desormais CONSTRUITE a
// partir de cette liste — les deux ne peuvent plus deriver, et le self-test l'asserte en plus.
const SCALAR_ADDR_FIELDS = [
  ['scammerAddress', 'scammer'],
  ['attacker', 'attacker'],
  ['tokenAddress', 'token'],
  ['contract', 'contract'],
  ['fundedBy', 'funder'],
];
const ARRAY_ADDR_FIELD = 'addresses';   // a list of already-implicated addresses on the incident

/** The `rekts` selection set, BUILT from the fields extractRows reads so the two cannot drift.
 *  Field NAMES may still need tuning against docs.de.fi/api/api.md — but a wrong name now fails loud
 *  (fetchRektsPage throws on an unexpected shape), never silently drops half the addresses. */
function buildRektsQuery() {
  const fields = [...SCALAR_ADDR_FIELDS.map(([f]) => f), ARRAY_ADDR_FIELD].join(' ');
  return `query Rekts($page:Int!,$size:Int!){ rekts(page:$page,pageSize:$size){ items{ project category chain ${fields} } pageInfo{ hasNextPage } } }`;
}

function extractRows(rekt) {
  const out = [];
  const category = rekt.category || rekt.type || 'defi-exploit';
  const incident = rekt.project || rekt.name || rekt.title || 'unknown';
  const chain = rekt.chain || rekt.network || null;
  const push = (addr, role) => {
    if (isAddr(addr)) out.push({ address: norm(addr), source: 'de.fi/rekt', category: `${category}:${role}`, incident, chain });
  };
  for (const [field, role] of SCALAR_ADDR_FIELDS) push(rekt[field], role);
  for (const a of (rekt[ARRAY_ADDR_FIELD] || [])) push(a, 'listed');
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
  const query = buildRektsQuery();
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
  /* ⛔ LA DERIVE QUI DROPPAIT LA MOITIE DES ADRESSES. Le self-test prouvait l'extraction de champs que
   * la requete live ne demandait pas. On asserte desormais que la requete NOMME chaque champ que
   * l'extracteur lit — sinon un incident reel perdrait cette adresse en silence, sur une DENYLIST. */
  const q = buildRektsQuery();
  for (const [field] of SCALAR_ADDR_FIELDS) {
    t(`live query requests the ${field} the extractor reads (no silent drop)`, q.includes(field));
  }
  t('live query requests the addresses[] field', q.includes(ARRAY_ADDR_FIELD));
  console.log(`\n[self-test] ${ok}/${n} checks passed`);
  return ok === n;
}

// ---- main ----------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const outIdx = argv.indexOf('--out');
  const out = outIdx > -1 ? argv[outIdx + 1] : null;
  /* ⛔ `--max-pages` BORNE LA BOUCLE, ET UNE BORNE ILLISIBLE VIDAIT LA DENYLIST EN SILENCE.
   * `parseInt(undefined)` vaut NaN, et `page <= NaN` est FAUX: la boucle de pullAll ne tournait pas
   * une seule fois, aucun appel API n'etait emis, et le script ECRIVAIT quand meme son fichier avec
   * `count: 0` avant de conclure « Next: merge into the MainStreet known-bad loader ». Exit 0.
   * MESURE DU 2026-08-15, endpoint pointe sur un port mort pour prouver qu'aucun appel ne part:
   *     --max-pages 2      -> « Pulling de.fi rekts (max 2 pages) », echec reseau, exit 1, RIEN d'ecrit
   *     --max-pages        -> exit 0, fichier ecrit, count=0
   *     --max-pages abc    -> exit 0, fichier ecrit, count=0
   *     --max-pages 0      -> exit 0, fichier ecrit, count=0
   *     --max-pages -5     -> exit 0, fichier ecrit, count=0
   * Sur une DENYLIST, le vide echoue OUVERT: plus rien n'est bloque. Et « 0 unique known-bad
   * addresses extracted » est une affirmation sur la SOURCE, alors que la source n'a pas ete
   * interrogee. Ce fichier annonce deux gardes fail-closed en tete; en voici la troisieme. */
  const mpIdx = argv.indexOf('--max-pages');
  let maxPages = 20;
  if (mpIdx > -1) {
    const brut = argv[mpIdx + 1];
    maxPages = Number(brut);
    if (!Number.isInteger(maxPages) || maxPages < 1) {
      console.error('REFUSED: --max-pages ' + JSON.stringify(brut === undefined ? null : brut)
        + ' is not a positive integer.');
      console.error('  A bound this loop cannot read is a bound of ZERO: pullAll would never run, no API');
      console.error('  call would be made, and an EMPTY denylist would be written as a successful pull.');
      console.error('  On a known-bad list, empty fails OPEN -- nothing gets blocked.');
      process.exit(2);
    }
  }

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
  /* ⛔ ZERO N'EST PAS UNE DENYLIST. Meme avec une borne valide, un pull qui ne rend rien ne doit pas
   * repartir en artefact: un fichier `addresses: []` merge dans le known-bad loader ne bloque plus
   * personne, et rien dans sa forme ne le distingue d'une extraction reussie. On refuse de l'ecrire
   * plutot que de laisser le lecteur decider s'il doit s'inquieter — meme doctrine fail-closed que
   * les deux gardes annoncees en tete de ce fichier. */
  if (!rows.length) {
    console.error('REFUSED to write: 0 addresses. An empty denylist is not a small denylist, it is an');
    console.error('  ABSENT one -- merged into the known-bad loader it blocks nobody, and its shape looks');
    console.error('  exactly like a successful pull. Check the API key, the credits and the `rekts` field');
    console.error('  names against docs.de.fi/api/api.md, then re-run.');
    process.exit(3);
  }
  const payload = { source: 'de.fi/rekt', generatedAt: new Date().toISOString(), count: rows.length, addresses: rows };
  if (out) { fs.writeFileSync(out, JSON.stringify(payload, null, 2)); console.error(`-> ${out}`); }
  else { console.log(JSON.stringify(payload, null, 2)); }
  console.error('Next: merge into the MainStreet known-bad loader (dedupe vs OFAC/eth-labels/ScamSniffer).');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
