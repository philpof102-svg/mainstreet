'use strict';
/**
 * Le CLI publie doit pouvoir RENDRE chacune de ses branches.
 *
 * ⛔ CE QUE CETTE PORTE A TROUVE EN NAISSANT, le 2026-08-15. `bin/mainstreet.js` est expose par
 * `package.json` sous trois noms (`mainstreet`, `mainstreet-oracle`, et via `files:["bin/"]` il part
 * dans le tarball npm), et AUCUN test ne l'importait: `test/oracle.test.js` charge `../oracle`,
 * `test/sdk.test.js` charge `../sdk`, personne ne chargeait les 336 lignes que l'utilisateur lance.
 * La commande `watchlist` referencait une constante `RED` qui n'a jamais ete declaree — le fichier
 * definit RESET/GREEN/BLUE/AMBER/DIM/BOLD, et ecrit le rouge en dur (`\x1b[31m`) partout ailleurs.
 *
 * ⚠️ ET ELLE NE TOMBAIT QUE SUR UNE BRANCHE SUR QUATRE. Mesure du 2026-08-15, en lancant le vrai
 * binaire contre un serveur local: delta positif → exit 0, delta nul → exit 0, score absent → exit 0,
 * DELTA NEGATIF → exit 1, `error: RED is not defined`, et la liste ne s'affiche pas du tout car le
 * throw part dans le `forEach` des la premiere ligne. Autrement dit: la watchlist fonctionnait tant
 * qu'aucun agent surveille ne perdait de points, c'est-a-dire tant qu'il ne se passait rien.
 * `node --check` rend 0 sur ce fichier — une variable non declaree n'est pas une erreur de syntaxe.
 *
 * 🎯 POURQUOI LE REFERENCE-ERROR EST LE BON CRITERE. Une fixture mal formee peut fabriquer un
 * TypeError (« Cannot read properties of undefined ») qui n'accuse que ma fixture. Elle ne peut PAS
 * fabriquer un ReferenceError: une variable non declaree est une propriete de la SOURCE, jamais des
 * donnees. Cette porte echoue donc uniquement sur des defauts du fichier teste.
 *
 * ⚖️ BORNES. Zero reseau externe: un serveur stub sur 127.0.0.1. Les formes des reponses ont ete
 * relevees sur l'API vivante le 2026-08-15 (`movers`, `tags`, `health-summary`, `watchlist`), mais
 * une fixture reste une COPIE: si l'API change de forme, cette porte continue de passer sur l'ancienne.
 * Elle prouve les lignes qu'elle ATTEINT — une branche qu'aucune fixture ne fait rendre n'est pas
 * couverte, et c'est exactement ainsi que `RED` a survecu.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

const RACINE = path.join(__dirname, '..');
const CLI = path.join(RACINE, 'bin', 'mainstreet.js');
const SRC = fs.readFileSync(CLI, 'utf8');

/* Adresses SYNTHETIQUES: aucune ne designe un compte reel. */
const A1 = '0x' + '11'.repeat(20);
const A2 = '0x' + '22'.repeat(20);

/* ───────── Fixtures. Formes relevees sur l'API vivante quand la route a pu etre lue. ───────── */
const AGENT = { payTo: A1, address: A1, score: 61, description: 'stub agent', jobCount: 12 };

function fixture(pathname) {
  if (pathname.startsWith('/api/agent/score/')) {
    return {
      score: 61, description: 'stub agent', metrics: { jobCount: 1200 },
      health: { alive: true, probedAt: '2026-08-15T00:00:00.000Z' },
      resourcePath: 'https://example.invalid/x', price: { amount: '250000', network: 'base' },
    };
  }
  if (pathname.startsWith('/api/agent/history/')) {
    return { count: 2, series: [{ date: '2026-08-14', score: 61, jobCount: 3 }, { date: '2026-08-15', score: null, jobCount: null }], note: 'stub' };
  }
  if (pathname.startsWith('/api/agent/tags/')) {
    return { tag: 'defi', count: 1, results: [AGENT] };
  }
  switch (pathname) {
    case '/api/agent/catalog':
      return { free: [{ route: '/api/agent/score/:a', purpose: 'stub' }], paid: [{ price: '0.25', route: '/api/agent/audit/:a', purpose: 'stub' }], agent: { payTo: A1, asset: A2 } };
    case '/api/agent/leaderboard':
      return { count: 1, totalIndexed: 1, results: [AGENT], networkBreakdown: { base: 1 } };
    case '/api/agent/compare':
      return { winner: 'a', margin: 7, recommendation: 'stub', a: Object.assign({ indexed: true }, AGENT), b: { indexed: false } };
    case '/api/agent/search':
      return { total: 1, count: 1, results: [Object.assign({ type: 'agent' }, AGENT)] };
    case '/api/agent/recommend':
      return { basis: { category: 'data', score: 61 }, results: [Object.assign({ sameCategory: true }, AGENT)] };
    case '/api/agent/me':
      return { project: 'stub', pitch: 'stub', operator: { address: A1 }, token: { address: A2, verified: true }, erc8004: { reputationRegistry: A2 }, metrics: { bazaarIndexed: 1, scoredToday: 1, badgesClaimed: 0 } };
    case '/api/agent/health-summary':
      return { totalIndexed: 1, totalProbed: 1, alive: 1, dead: 0, uptimePct: 100, aliveTop: [], note: null };
    case '/api/agent/movers':
      /* La branche opposee de celle qui casse: une BAISSE, rendue par le rouge ecrit en dur. */
      return { asOf: '2026-08-15T00:00:00.000Z', totalScored: 2, withDelta: 2, note: null,
        gainers: [{ payTo: A1, scoreToday: 61, scoreYesterday: 54, delta: 7, jobCount: 1, description: 'up' }],
        losers: [{ payTo: A2, scoreToday: 40, scoreYesterday: 55, delta: -15, jobCount: 1, description: 'down' }] };
    case '/api/agent/featured':
      return { picks: [{ label: 'stub', score: 61, description: 'stub', payTo: A1 }] };
    case '/api/agent/tags':
      return { count: 1, tags: [{ tag: 'defi', count: 3 }] };
    case '/api/agent/match':
      return { count: 1, noStrongMatch: true, note: 'stub', matches: [Object.assign({ matchScore: 4.5, price: { amountUsdc: 0.05 }, serviceUrl: 'https://example.invalid/x', settlements: { count: 2, volumeUsdc: 0.5 }, sla: { latencyP50ms: 120, okRate: 0.98 } }, AGENT)] };
    case '/api/agent/receipts':
      return { summary: { total: 3, successRate: 0.66, avgRating: 71, avgLatencyMs: 210 } };
    case '/api/agent/watchlist':
      /* LE CAS QUI A FAIT NAITRE CETTE PORTE: un agent surveille qui a PERDU des points. */
      return { count: 3, watching: [
        { current_score: 61, last_score: 54, watch_addr: A1, label: 'monte' },
        { current_score: 40, last_score: 55, watch_addr: A2, label: 'baisse' },
        { current_score: null, last_score: null, watch_addr: A1, label: 'sans score' },
      ] };
    default:
      return null;
  }
}

/* ───────── Les commandes, lues dans la SOURCE plutot que recopiees. ───────── */
function commandesDeclarees(src) {
  const debut = src.indexOf('const commands = {');
  assert.notEqual(debut, -1, 'marqueur `const commands = {` introuvable — le parseur ne lit plus le bon fichier');
  const corps = src.slice(debut);
  const fin = corps.indexOf('\n};');
  assert.notEqual(fin, -1, 'fin de l objet `commands` introuvable');
  return [...corps.slice(0, fin).matchAll(/\n {2}(?:async )?([a-z][A-Za-z0-9]*)\s*\(/g)].map((m) => m[1]);
}

/* Chaque commande doit avoir un scenario, ou une ligne de justification. Pas de motif. */
const SCENARIOS = new Map([
  ['score', [A1]], ['audit', [A1]], ['catalog', []], ['leaderboard', ['3']],
  ['compare', [A1, A2]], ['search', ['data', 'agent']], ['recommend', [A1, '3']],
  ['history', [A1, '7']], ['stats', []], ['movers', ['2']], ['featured', []], ['me', []],
  ['tags', ['5']], ['tagged', ['defi', '3']], ['match', ['find', 'a', 'data', 'agent']],
  ['pick', ['find', 'a', 'data', 'agent']], ['receipts', [A1]], ['watchlist', [A1]], ['help', []],
]);

/* `help()` n'annonce pas tout ce que le CLI sait faire. Liste EXPLICITE, chaque ligne se justifie. */
const ABSENTES_DU_HELP = new Map([
  ['audit', 'commande PAYANTE ($0.25) — presente dans l en-tete du fichier, absente de `mainstreet help`'],
  ['catalog', 'liste les routes gratuites ET payantes — presente dans l en-tete, absente de `mainstreet help`'],
  ['help', 'la commande help ne se liste pas elle-meme'],
]);

let srv;
let origine;
const vus = new Set();

test.before(async () => {
  srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    vus.add(u.pathname);
    const f = fixture(u.pathname);
    res.writeHead(f === null ? 404 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(f === null ? { error: 'no fixture for ' + u.pathname } : f));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  origine = 'http://127.0.0.1:' + srv.address().port;
});

test.after(() => { if (srv) srv.close(); });

function lancer(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI].concat(args), {
      env: Object.assign({}, process.env, { MAINSTREET_ORIGIN: origine }),
      timeout: 20000,
    }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr }));
  });
}

test('chaque commande du CLI a un scenario', () => {
  const declarees = commandesDeclarees(SRC);
  /* Temoin: un parseur qui ne lit plus rien ferait passer la porte en n ayant rien verifie. */
  assert.ok(declarees.length >= 15, 'succes vide: ' + declarees.length + ' commande(s) lue(s) dans la source');
  assert.ok(declarees.includes('score') && declarees.includes('watchlist'),
    'temoin: `score` et `watchlist` doivent etre lues — sinon le parseur lit autre chose');
  const sansScenario = declarees.filter((c) => !SCENARIOS.has(c));
  assert.deepEqual(sansScenario, [],
    'commande(s) du CLI que cette porte ne lance jamais: ' + JSON.stringify(sansScenario)
    + '\n  Une commande publiee que rien ne rend est exactement la situation qui a laisse passer `RED`.');
});

test('aucune commande ne reference une variable non declaree', async () => {
  const casses = [];
  for (const [cmd, args] of SCENARIOS) {
    const r = await lancer([cmd].concat(args));
    if (/is not defined/.test(r.stderr)) casses.push(cmd + ': ' + r.stderr.trim());
    else if (r.code !== 0) casses.push(cmd + ': exit ' + r.code + ' — ' + r.stderr.trim());
  }
  assert.deepEqual(casses, [],
    'commande(s) en echec:\n  ' + casses.join('\n  ')
    + '\n  Un `is not defined` ne peut pas venir de la fixture: c est une propriete de la source.');
});

test('la watchlist REND la baisse — le cas qui a fait naitre la porte', async () => {
  const r = await lancer(['watchlist', A1]);
  assert.equal(r.code, 0, 'la watchlist doit rendre une baisse sans mourir — stderr: ' + r.stderr.trim());
  /* Accessibilite: sans cette assertion, une fixture sans baisse ferait passer la porte a vide. */
  assert.ok(r.stdout.includes('-15'),
    'la ligne en BAISSE doit apparaitre: c est la seule branche qui exerce le rouge nomme.\n'
    + '       stdout: ' + JSON.stringify(r.stdout));
  assert.ok(r.stdout.includes('+7'), 'la ligne en HAUSSE doit apparaitre — cas oppose');
  assert.equal(vus.has('/api/agent/watchlist'), true,
    'temoin: le stub doit avoir ete appele, sinon le CLI n a rien rendu du tout');
});

test('les commandes absentes de `help` sont listees ici, une par une', () => {
  const declarees = commandesDeclarees(SRC);
  const debut = SRC.indexOf('  help() {');
  assert.notEqual(debut, -1, 'marqueur `help() {` introuvable');
  const texteHelp = SRC.slice(debut, SRC.indexOf('`);', debut));
  const absentes = declarees.filter((c) => !new RegExp('\\n  ' + c + '\\b').test(texteHelp)).sort();
  assert.deepEqual(absentes, [...ABSENTES_DU_HELP.keys()].sort(),
    'ecart entre les commandes du CLI et ce que `mainstreet help` annonce.\n       trouve : '
    + absentes.join(' ') + '\n       liste  : ' + [...ABSENTES_DU_HELP.keys()].sort().join(' ')
    + '\n  ⇒ Une commande EN PLUS = le CLI sait faire une chose que son aide ne dit pas. Une commande'
    + ' EN MOINS = elle a ete ajoutee au help: retirer sa ligne d ici.');
});
