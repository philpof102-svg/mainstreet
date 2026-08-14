'use strict';
/**
 * Un paramètre déclaré à un LLM doit avoir un EFFET.
 *
 * `sdk/tools.js` est exporté sous `mainstreet-oracle/tools` et decrit 6 outils a des frameworks de
 * function-calling. `test/sdk.test.js` charge `../sdk`, pas `../sdk/tools`: ce fichier n'avait jamais
 * ete exerce. Un schema d'outil est une PROMESSE faite a un modele — s'il annonce `onlyVerified`, le
 * modele le posera et croira avoir filtre. Un parametre declare mais jamais lu est donc pire qu'une
 * absence: il est invisible des deux cotes.
 *
 * ⚖️ RESULTAT DU 2026-08-15: RIEN A CORRIGER. Les 21 parametres des 6 outils ont tous un effet
 * mesurable, les 5 adaptateurs (openai, anthropic, langchain, mastra, vercelAiSdk) exposent les
 * memes 6 noms, et `execute` route correctement — y compris `allowWeak`, que `pickSpec` extrait du
 * corps pour le passer en second argument, la ou `sdk.pick` le lit. Cette porte fige cet etat.
 *
 * 🔬 TROIS INSTRUMENTS ONT ETE NECESSAIRES, et les deux premiers n'ont produit que du faux.
 *   v1 cherchait le NOM du parametre dans la requete: 4 faux positifs, parce qu'un argument passe
 *      dans le CHEMIN n'y laisse que sa valeur, et qu'un controle cote client n'y laisse rien.
 *   v2 comparait « absent » a « present »: 2 faux positifs, parce que L'ABSENCE RETOMBE SUR UN
 *      DEFAUT. `sdk.vet` declare `requireAlive = true`, donc retirer la cle equivaut a la mettre a
 *      `true`; et pour `allowWeak`, `false` et `undefined` sont tous deux faux. Dans les deux cas on
 *      comparait une valeur a elle-meme.
 *   v3 comparait deux valeurs explicites et acceptait un effet sur la requete OU sur le resultat.
 *      Vert du premier coup, donc mutation obligatoire — et LA MUTATION L'A TRAVERSE. En cassant le
 *      routage de `allowWeak` (le passer dans le corps au lieu des options), le parametre cesse
 *      d'etre AGI mais continue d'etre ENVOYE: la requete change, le detecteur voit un effet, et la
 *      porte reste verte. « La requete a change » ne prouve pas qu'un parametre est LU — seulement
 *      qu'il a ete transmis.
 *   v4 — celui-ci — exige, pour chaque parametre, le TYPE d'effet attendu: `requete` pour ce qui
 *      part au serveur, `resultat` pour ce que le SDK decide lui-meme. Un parametre cote client qui
 *      se contenterait de fuir dans le corps est alors rouge.
 *
 * ⚖️ BORNES. Aucun reseau: stub sur 127.0.0.1. « Un effet » ne veut pas dire « le bon effet »: cette
 * porte prouve qu'un parametre est LU, pas qu'il filtre correctement cote serveur. Et elle ne teste
 * que les paires ecrites ci-dessous — d'ou le recensement, qui refuse tout parametre sans paire.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const T = require(path.join(RACINE, 'sdk', 'tools.js'));
const ms = require(path.join(RACINE, 'sdk', 'index.js'));

const A1 = '0x' + '11'.repeat(20);
const A2 = '0x' + '22'.repeat(20);

let srv;
let derniere = null;

test.before(async () => {
  srv = http.createServer((req, res) => {
    let corps = '';
    req.on('data', (c) => { corps += c; });
    req.on('end', () => {
      derniere = req.method + ' ' + req.url + ' ' + corps;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.startsWith('/api/agent/match')) {
        /* `noStrongMatch` est ce qui rend `allowWeak` observable. */
        res.end(JSON.stringify({ count: 1, noStrongMatch: true, tokens: ['a', 'b'],
          matches: [{ payTo: A2, score: 55, matchScore: 1 }] }));
      } else if (req.url.startsWith('/api/agent/score/')) {
        /* `alive:false` rend `requireAlive` observable; le score 55 rend `minScore` observable. */
        res.end(JSON.stringify({ score: 55, health: { alive: false }, resourcePath: 'https://exemple.invalid/a' }));
      } else {
        res.end('{"ok":true,"results":[]}');
      }
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  ms.configure({
    origin: 'http://127.0.0.1:' + srv.address().port,
    headers: { 'x-ms-monitor': '1' },
  });
});

test.after(() => { if (srv) srv.close(); });

/**
 * Pour chaque parametre: DEUX jeux d'arguments explicites qui ne different que par lui, plus le TYPE
 * d'effet attendu.
 *   `requete`  — il part au serveur; la requete emise doit differer.
 *   `resultat` — le SDK s'en sert LUI-MEME; c'est ce que l'appel rend qui doit differer.
 * ⛔ Ne PAS ecrire « avec la cle / sans la cle »: l'absence retombe sur un defaut, et on finirait par
 * comparer une valeur a elle-meme (`sdk.vet` declare `requireAlive = true`).
 * ⛔ Et ne PAS accepter n'importe quel effet pour un parametre `resultat`: un parametre cote client
 * casse continue de fuir dans le corps, donc la requete change alors qu'il n'est plus lu.
 */
const PAIRES = {
  mainstreet_match: {
    intent: [{ intent: 'traduire' }, { intent: 'autre chose' }, 'requete'],
    maxPrice: [{ intent: 'x', maxPrice: 0.01 }, { intent: 'x', maxPrice: 9 }, 'requete'],
    minScore: [{ intent: 'x', minScore: 10 }, { intent: 'x', minScore: 90 }, 'requete'],
    limit: [{ intent: 'x', limit: 1 }, { intent: 'x', limit: 9 }, 'requete'],
    onlyRegistered: [{ intent: 'x', onlyRegistered: false }, { intent: 'x', onlyRegistered: true }, 'requete'],
    onlyVerified: [{ intent: 'x', onlyVerified: false }, { intent: 'x', onlyVerified: true }, 'requete'],
  },
  mainstreet_pick: {
    intent: [{ intent: 'traduire', allowWeak: true }, { intent: 'autre', allowWeak: true }, 'requete'],
    maxPrice: [{ intent: 'x', allowWeak: true, maxPrice: 0.01 }, { intent: 'x', allowWeak: true, maxPrice: 9 }, 'requete'],
    minScore: [{ intent: 'x', allowWeak: true, minScore: 10 }, { intent: 'x', allowWeak: true, minScore: 90 }, 'requete'],
    /* Le cas qui a demande quatre instruments: false CONTRE true, et l'effet doit etre sur le
     * RESULTAT — casser son routage le laisse fuir dans le corps, ce qui ne compte pas. */
    allowWeak: [{ intent: 'x', allowWeak: false }, { intent: 'x', allowWeak: true }, 'resultat'],
    onlyRegistered: [{ intent: 'x', allowWeak: true, onlyRegistered: false }, { intent: 'x', allowWeak: true, onlyRegistered: true }, 'requete'],
    onlyVerified: [{ intent: 'x', allowWeak: true, onlyVerified: false }, { intent: 'x', allowWeak: true, onlyVerified: true }, 'requete'],
  },
  mainstreet_score: { address: [{ address: A1 }, { address: A2 }, 'requete'] },
  mainstreet_compare: {
    a: [{ a: A1, b: A2 }, { a: A2, b: A2 }, 'requete'],
    b: [{ a: A1, b: A2 }, { a: A1, b: A1 }, 'requete'],
  },
  mainstreet_leaderboard: {
    limit: [{ limit: 1 }, { limit: 9 }, 'requete'],
    network: [{ network: 'base' }, { network: 'solana' }, 'requete'],
  },
  mainstreet_vet: {
    address: [{ address: A1, minScore: 10, requireAlive: false }, { address: A2, minScore: 10, requireAlive: false }, 'requete'],
    minScore: [{ address: A1, minScore: 10, requireAlive: false }, { address: A1, minScore: 99, requireAlive: false }, 'resultat'],
    requireAlive: [{ address: A1, minScore: 10, requireAlive: true }, { address: A1, minScore: 10, requireAlive: false }, 'resultat'],
  },
};

async function effet(nom, args) {
  derniere = null;
  let issue;
  try { issue = 'OK ' + JSON.stringify(await T.execute(nom, args)); }
  catch (e) { issue = 'LEVE ' + e.message; }
  return { req: derniere, issue };
}

test('les 5 adaptateurs annoncent exactement les memes outils', () => {
  const attendus = T.specs().map((s) => s.name).sort();
  assert.ok(attendus.length >= 5, 'succes vide: ' + attendus.length + ' outil(s) declare(s)');
  const parAdaptateur = {
    openai: T.openai().map((x) => x.function.name),
    anthropic: T.anthropic().map((x) => x.name),
    langchain: T.langchain().map((x) => x.name),
    mastra: T.mastra().map((x) => x.id),
    vercelAiSdk: Object.keys(T.vercelAiSdk()),
  };
  for (const [nom, liste] of Object.entries(parAdaptateur)) {
    assert.deepEqual(liste.slice().sort(), attendus,
      'l adaptateur ' + nom + ' n annonce pas les memes outils que specs()');
  }
});

test('chaque parametre declare a une paire de test', () => {
  const sansPaire = [];
  for (const s of T.specs()) {
    for (const p of Object.keys(s.parameters.properties || {})) {
      if (!PAIRES[s.name] || !PAIRES[s.name][p]) sansPaire.push(s.name + '.' + p);
    }
  }
  assert.deepEqual(sansPaire, [],
    'parametre(s) declare(s) que cette porte n exerce pas: ' + JSON.stringify(sansPaire)
    + '\n  Un parametre ajoute au schema sans etre cable est invisible des deux cotes: le modele le'
    + ' pose et croit avoir filtre. Lui ecrire une paire, ou le retirer du schema.');
  /* Et l inverse: une paire qui survit a la disparition de son parametre. */
  const orphelines = [];
  const declares = new Set(T.specs().flatMap((s) => Object.keys(s.parameters.properties || {}).map((p) => s.name + '.' + p)));
  for (const [outil, params] of Object.entries(PAIRES)) {
    for (const p of Object.keys(params)) if (!declares.has(outil + '.' + p)) orphelines.push(outil + '.' + p);
  }
  assert.deepEqual(orphelines, [], 'paire(s) pour un parametre qui n existe plus: ' + JSON.stringify(orphelines));
});

test('chaque parametre declare a l effet de SON type', async () => {
  const morts = [];
  let exerces = 0;
  for (const [outil, params] of Object.entries(PAIRES)) {
    for (const [p, [argsA, argsB, attendu]] of Object.entries(params)) {
      const a = await effet(outil, argsA);
      const b = await effet(outil, argsB);
      exerces++;
      const observe = attendu === 'requete' ? a.req !== b.req : a.issue !== b.issue;
      if (!observe) morts.push(outil + '.' + p + ' (attendu: ' + attendu + ')');
    }
  }
  /* Temoin: sans lui, une boucle qui n exerce rien passerait. */
  assert.ok(exerces >= 15, 'succes vide: ' + exerces + ' parametre(s) exerce(s)');
  assert.deepEqual(morts, [],
    'parametre(s) declare(s) sans l effet attendu: ' + JSON.stringify(morts)
    + '\n  Un parametre `resultat` doit changer ce que l appel REND. S il ne change que la requete,'
    + ' c est qu il fuit dans le corps sans etre lu — le schema promet alors un filtre au modele que'
    + ' le code n applique pas.');
});

test('CAS OPPOSE: un parametre inconnu n a evidemment aucun effet', async () => {
  /* Sans ceci, une porte qui declarerait TOUT « avec effet » passerait le test precedent. */
  const a = await effet('mainstreet_score', { address: A1 });
  const b = await effet('mainstreet_score', { address: A1, parametreQuiNExistePas: 'xyz' });
  assert.equal(a.req, b.req, 'un parametre non declare ne doit rien changer — sinon le detecteur'
    + ' verrait un effet partout et ne prouverait rien');
  assert.equal(a.issue, b.issue, 'et le resultat non plus');
});

test('un nom d outil inconnu est refuse', async () => {
  await assert.rejects(() => T.execute('mainstreet_inexistant', {}), /unknown MainStreet tool/);
});
