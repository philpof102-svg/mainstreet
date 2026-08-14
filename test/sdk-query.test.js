'use strict';
/**
 * Rien de ce qu'un appelant fournit ne doit entrer BRUT dans une query string.
 *
 * `test/sdk.test.js` couvre 9 des 29 exports de `sdk/index.js`. Les VINGT autres n'avaient jamais
 * ete appeles. Mesure du 2026-08-15, en lancant chacun contre un stub local qui note l'URL:
 *
 *   ms.movers('x&limit=999&admin=1')    ->  GET /api/agent/movers?limit=x&limit=999&admin=1
 *   ms.trending('x&limit=999&admin=1')  ->  GET /api/agent/trending?limit=x&limit=999&admin=1
 *   ms.random('x&limit=999&admin=1')    ->  GET /api/agent/random?network=x&limit=999&admin=1
 *
 * 💎 ET LE MOTIF EST PLUS FIN QUE « ILS N'ENCODAIENT PAS ». Dans `search`, `recommend`, `tagged` et
 * `history`, l'argument qui AVAIT L'AIR dangereux etait bien assaini — `encodeURIComponent(query)`,
 * `requireAddr(forAddress)`, `encodeURIComponent(tag)` — et celui qui AVAIT L'AIR d'un nombre
 * (`limit`, `days`) restait brut DANS LA MEME EXPRESSION. Un parametre n'est pas assaini par son
 * NOM ni par sa valeur par defaut: `limit = 5` ne promet rien sur ce qu'un appelant passera.
 * `ms.movers(req.query.limit)` est une ligne que n'importe quelle application ecrit.
 *
 * ⚖️ CE QUI BORNE LA GRAVITE, mesure et non suppose. Le chemin est fixe et le `?` deja present, donc
 * seule la QUERY est polluee: pas de changement de route, pas d'hote tiers. Et quatre methodes
 * refusaient deja correctement — `history`, `recommend`, `receipts`, `watchlist` passent par
 * `requireAddr` et LEVENT avant d'emettre quoi que ce soit; `tagged` et `listWebhooks` encodaient;
 * les trois ecritures (`subscribeWebhook`, `postReceipt`, `addWatch`) et `buildReceiptMessage`
 * validaient leur payload et n'emettaient rien. Le correctif n'invente pas une discipline absente,
 * il etend celle que `leaderboard` appliquait deja avec `URLSearchParams`, dans le meme fichier.
 *
 * ⚖️ AUTRE BORNE: `URLSearchParams` encode l'espace en « + » la ou `encodeURIComponent` donne
 * « %20 ». Les deux se decodent en espace dans tout analyseur de query; les octets changent, le sens
 * non. Aucun reseau: stub sur 127.0.0.1.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const ms = require(path.join(RACINE, 'sdk', 'index.js'));

const ADR = '0x' + '11'.repeat(20);
const INJECTION = 'x&limit=999&admin=1';

let srv;
const vues = [];

test.before(async () => {
  srv = http.createServer((req, res) => {
    vues.push(req.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  ms.configure({
    origin: 'http://127.0.0.1:' + srv.address().port,
    /* Meme un test local porte l entete: c est la convention de la maison. */
    headers: { 'x-ms-monitor': '1' },
  });
});

test.after(() => { if (srv) srv.close(); });

async function urlDe(fn) {
  const avant = vues.length;
  await fn();
  const nouvelles = vues.slice(avant);
  assert.equal(nouvelles.length, 1, 'accessibilite: exactement une requete attendue, vu ' + nouvelles.length);
  return new URL(nouvelles[0], 'http://127.0.0.1');
}

/* Chaque cas: la methode, le parametre qu'elle declare, et l argument hostile. */
const CAS = [
  ['movers', 'limit', () => ms.movers(INJECTION)],
  ['trending', 'limit', () => ms.trending(INJECTION)],
  ['random', 'network', () => ms.random(INJECTION)],
  ['search', 'limit', () => ms.search('deux mots', INJECTION)],
  ['recommend', 'limit', () => ms.recommend(ADR, INJECTION)],
  ['tagged', 'limit', () => ms.tagged('defi', INJECTION)],
  ['history', 'days', () => ms.history(ADR, INJECTION)],
];

test('aucun argument d appelant n injecte de parametre dans la query', async () => {
  const fautifs = [];
  for (const [nom, param, appel] of CAS) {
    const u = await urlDe(appel);
    /* Le test decisif: l injection ajoutait `admin=1` et un SECOND `limit`. */
    if (u.searchParams.has('admin')) fautifs.push(nom + ': parametre injecte `admin` -> ' + u.search);
    else if (u.searchParams.getAll(param).length !== 1) {
      fautifs.push(nom + ': ' + u.searchParams.getAll(param).length + ' fois `' + param + '` -> ' + u.search);
    }
  }
  assert.deepEqual(fautifs, [],
    'query(s) polluee(s):\n  ' + fautifs.join('\n  ')
    + '\n  Un parametre n est pas assaini par son NOM: `limit = 5` ne promet rien sur ce qu un'
    + ' appelant passera. Construire la query avec URLSearchParams, comme `leaderboard`.');
});

test('TEMOIN: les URLs des entrees valides ne changent pas', async () => {
  const attendus = [
    [() => ms.movers(5), '/api/agent/movers?limit=5'],
    [() => ms.trending(10), '/api/agent/trending?limit=10'],
    [() => ms.random('base'), '/api/agent/random?network=base'],
    [() => ms.random(), '/api/agent/random'],
    [() => ms.tagged('defi', 50), '/api/agent/tags/defi?limit=50'],
    [() => ms.history(ADR, 30), '/api/agent/history/' + ADR.toLowerCase() + '?days=30'],
    [() => ms.recommend(ADR, 5), '/api/agent/recommend?for=' + ADR.toLowerCase() + '&limit=5'],
    [() => ms.search('abc', 10), '/api/agent/search?q=abc&limit=10'],
  ];
  for (const [appel, attendu] of attendus) {
    const avant = vues.length;
    await appel();
    assert.equal(vues[avant], attendu, 'l URL d une entree VALIDE ne doit pas bouger');
  }
});

test('CAS OPPOSE: les gardes qui refusaient deja refusent toujours', async () => {
  /* Sans ceci, remplacer les gardes par un encodage passerait inapercu. */
  const avant = vues.length;
  for (const [nom, appel] of [
    ['history', () => ms.history('../../revenue')],
    ['recommend', () => ms.recommend('../../revenue')],
    ['receipts', () => ms.receipts('../../revenue')],
    ['watchlist', () => ms.watchlist('../../revenue')],
  ]) {
    await assert.rejects(appel, /invalid address/, nom + ' doit refuser une adresse invalide');
  }
  assert.equal(vues.length, avant, 'et AUCUNE requete ne doit partir: le refus est avant le reseau');
});

test('CAS OPPOSE: les ecritures refusent un payload incomplet sans rien emettre', async () => {
  const avant = vues.length;
  for (const [nom, appel] of [
    ['subscribeWebhook', () => ms.subscribeWebhook({ subscriber: ADR })],
    ['postReceipt', () => ms.postReceipt({ agent: ADR })],
    ['addWatch', () => ms.addWatch({ subscriber: ADR })],
  ]) {
    await assert.rejects(appel, /requires/, nom + ' doit exiger son payload complet');
  }
  assert.equal(vues.length, avant, 'aucune ECRITURE ne doit partir sur un payload incomplet');
});
