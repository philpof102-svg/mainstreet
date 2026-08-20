// cli-colour-is-an-assertion.test.js
// ================================================================================================
// `bin/mainstreet.js` est le binaire que `npx mainstreet` execute chez un integrateur. Dans un
// terminal, LA COULEUR SE LIT AVANT LE TEXTE — un vert est donc une affirmation, au meme titre
// qu'une phrase.
//
// MESURE du 2026-08-20, en lisant la source et en sondant la prod une fois (GET, lecture seule) :
//
//  1. `${GREEN}(${d.token?.verified})` — le vert etait applique a la POSITION, jamais au contenu.
//     `false`, `undefined` ou n'importe quelle chaine sortaient en vert. Et ce champ EST une chaine
//     libre venue d'un service tiers : sur la prod il vaut « full_match (Sourcify, decentralized) ».
//     Le jour ou il vaut « partial_match », le CLI le peint toujours en vert.
//
//  2. `${GREEN}${(d.summary.successRate*100).toFixed(0)}%` — un taux de reussite de 0 % sortait
//     EN VERT. Les deux lignes juste en dessous (`avgRating`, `avgLatencyMs`) portent deja un
//     `!= null` : trois champs, deux gardes. L'asymetrie interne etait le signal.
//
//  3. `me.metrics?.scoredToday || 0` — un compteur ABSENT devenait « 0 », c'est-a-dire « nous avons
//     regarde et il n'y a rien », alors que c'est « nous n'avons pas regarde ». Le serveur, lui,
//     distingue deja les deux : il sert `settlements24h: null` a cote de `settlementsWindowStale`.
//
// POURQUOI `test/cli.test.js` NE L'A PAS VU, et c'est la lecon reutilisable : ses fixtures ne
// portent QUE des valeurs deja bonnes (`verified: true`, `successRate: 0.66`, tous les compteurs
// presents). Un rendu qui affirme « bien » sans regarder est alors INDISTINGUABLE d'un rendu qui
// juge. Ce fichier fournit les valeurs que l'autre n'a jamais fournies.
//
// ⛔ BORNE : on verifie ce que le binaire IMPRIME. Rien sur le paquet deja publie sur npm, qui sert
// encore l'ancien rendu.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { execFile } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'bin', 'mainstreet.js');
const VERT = '\x1b[32m';
const A1 = '0x' + '11'.repeat(20);

let srv, origine;
let reponses = {};

test.before(async () => {
  srv = http.createServer((req, res) => {
    const p = req.url.split('?')[0];
    const corps = reponses[p];
    res.writeHead(corps === undefined ? 404 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(corps ?? { error: 'no fixture for ' + p }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  origine = 'http://127.0.0.1:' + srv.address().port;
});
test.after(() => { if (srv) srv.close(); });

const lancer = (args) => new Promise((res, rej) => {
  execFile(process.execPath, [CLI].concat(args), {
    env: Object.assign({}, process.env, { MAINSTREET_ORIGIN: origine }),
    timeout: 20000,
  }, (err, out, errout) => (err && !out ? rej(new Error(err.message + ' | ' + errout)) : res(out)));
});

/* ⚠️ MON PREMIER MONTAGE ETAIT FAUX, pas le code. J'asserte le CONTENU avec une regexp qui
 * tolerait les codes ANSI a UN endroit — or `indexed:` est suivi d'un RESET *puis* d'un espace,
 * donc `indexed:\s*(ANSI)*0` ne matchait pas un zero pourtant bien imprime. Deux lectures
 * separees valent mieux qu'une regexp qui essaie de faire les deux : le CONTENU se lit depouille,
 * la COULEUR se lit sur le brut. */
const sansCouleur = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const meAvec = (token, metrics) => ({
  '/api/agent/me': { project: 'stub', pitch: 'stub', operator: { address: A1 }, token,
    erc8004: { reputationRegistry: A1 }, metrics },
});

test('TEMOIN: le vert EXISTE toujours — un booleen `true` reste un oui lisible', async () => {
  reponses = meAvec({ address: A1, verified: true }, { bazaarIndexed: 5, scoredToday: 3, badgesClaimed: 1 });
  const out = await lancer(['me']);
  assert.ok(out.includes(VERT + '(true)'),
    'sans ce temoin, un CLI qui n aurait PLUS AUCUN vert passerait tous les cas suivants');
});

test('un `verified: false` n est plus peint en vert', async () => {
  reponses = meAvec({ address: A1, verified: false }, { bazaarIndexed: 5, scoredToday: 3, badgesClaimed: 1 });
  const out = await lancer(['me']);
  assert.ok(out.includes('(false)'), 'la valeur reste VISIBLE — on retire l affirmation, pas l information');
  assert.ok(!out.includes(VERT + '(false)'), 'et elle n est plus verte');
});

test('une chaine de verification tierce s affiche en neutre, sans verdict de couleur', async () => {
  // La valeur REELLE relevee sur la prod le 2026-08-20.
  reponses = meAvec({ address: A1, verified: 'partial_match (Sourcify)' }, { bazaarIndexed: 5, scoredToday: 3, badgesClaimed: 1 });
  const out = await lancer(['me']);
  assert.ok(out.includes('partial_match (Sourcify)'), 'la chaine est servie telle quelle');
  assert.ok(!out.includes(VERT + '(partial_match (Sourcify))'),
    'le CLI ne DECIDE pas quelles chaines valent « verifie » — il ne les peint donc pas en vert');
});

test('une verification ABSENTE se dit, au lieu de sortir « undefined » en vert', async () => {
  reponses = meAvec({ address: A1 }, { bazaarIndexed: 5, scoredToday: 3, badgesClaimed: 1 });
  const out = await lancer(['me']);
  assert.ok(!/\(undefined\)/.test(out), '« (undefined) » n est pas une information');
  assert.ok(out.includes('verification unknown'), 'l absence porte son nom');
  assert.ok(!out.includes(VERT + '(verification unknown)'), 'et elle n est surtout pas verte');
});

test('un compteur ABSENT rend « — », jamais un zero que personne n a mesure', async () => {
  reponses = meAvec({ address: A1, verified: true }, {});
  const out = await lancer(['me']);
  assert.ok(!/indexed:\s*0\b/.test(sansCouleur(out)),
    'un compteur absent sortait « 0 » — « nous avons regarde et il n y a rien »');
  assert.ok(!/undefined/.test(out), 'et jamais « undefined »');
  assert.ok(out.includes('—'), 'l absence a son signe');
});

test('CAS OPPOSE: un ZERO REEL reste un zero, il ne devient pas « — »', async () => {
  reponses = meAvec({ address: A1, verified: true }, { bazaarIndexed: 0, scoredToday: 0, badgesClaimed: 0 });
  const out = await lancer(['me']);
  assert.ok(/indexed:\s*0\b/.test(sansCouleur(out)),
    'zero MESURE et absence doivent rester deux affichages differents — sinon on a juste deplace la confusion');
});

test('`stats`: le compteur absent ne sort plus vert, le mesure oui', async () => {
  const sante = { totalIndexed: 1, totalProbed: 1, alive: 1, dead: 0, uptimePct: 100, aliveTop: [], note: null };
  reponses = { '/api/agent/me': { metrics: {} }, '/api/agent/leaderboard': { count: 0, results: [] }, '/api/agent/health-summary': sante };
  const absent = await lancer(['stats']);
  assert.ok(!absent.includes(VERT + '0'), 'un zero VERT sur une mesure absente');
  assert.ok(/Scored today:\s*—/.test(sansCouleur(absent)), 'et l absence porte son signe');
  reponses['/api/agent/me'] = { metrics: { bazaarIndexed: 9, scoredToday: 7, badgesClaimed: 2 } };
  const mesure = await lancer(['stats']);
  assert.ok(mesure.includes(VERT + '7'), 'TEMOIN: une vraie mesure garde son vert');
});

test('`receipts`: un taux de reussite de 0 % n est plus peint en vert', async () => {
  reponses = { '/api/agent/receipts': { summary: { total: 3, successRate: 0, avgRating: null, avgLatencyMs: null } } };
  const out = await lancer(['receipts', A1]);
  assert.ok(/success rate:\s*0%/.test(out), 'le chiffre reste affiche — c est une vraie mesure');
  assert.ok(!out.includes(VERT + '0%'), '0 % de reussite sortait avec la couleur qui dit « tout va bien »');
  assert.ok(!out.includes('avg rating'), 'les deux champs null gardent leur garde `!= null` — inchangee');
});

test('`receipts`: un taux NON MESURABLE le dit, au lieu de sortir « NaN% »', async () => {
  reponses = { '/api/agent/receipts': { summary: { total: 3, avgRating: 71, avgLatencyMs: 210 } } };
  const out = await lancer(['receipts', A1]);
  assert.ok(!/NaN/.test(out), '`(undefined*100).toFixed(0)` rendait « NaN% »');
  assert.ok(/not measured/.test(out), 'l absence se nomme');
  assert.ok(/avg rating/.test(out), 'TEMOIN: les champs presents s affichent toujours');
});
