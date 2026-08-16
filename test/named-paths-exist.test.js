'use strict';
/**
 * UN CHEMIN NOMMÉ DANS UNE INSTRUCTION DOIT EXISTER.
 * ==================================================================================================
 * `scripts/deploy-token.js` refuse de tourner quand son artefact de compilation manque, et dit a
 * l'utilisateur quoi faire:
 *
 *     console.error('compile artifact missing — run: node scripts/compile-main-token.js');
 *
 * MESURE DU 2026-08-15: `scripts/compile-main-token.js` N'EXISTE PAS. Le script s'appelle
 * `scripts/compile.js`. Son en-tete nomme aussi `node scripts/deploy-main-token.js`, qui n'existe pas
 * davantage (le fichier est `scripts/deploy-token.js`). Deux renommages, deux chaines restees en
 * arriere — dans le seul message que l'utilisateur voit au moment ou il est bloque.
 *
 * ⛔ CES DEUX CHAINES NE SONT PAS CORRIGEES ICI. `scripts/deploy-token.js` DEPLOIE et SIGNE (6
 * marqueurs: PRIVATE_KEY, privateKeyToAccount, deployContract…). Le toucher est un geste d'operateur,
 * pas une correction d'audit. Elles sont donc LISTEES ci-dessous, justifiees, et la liste doit
 * correspondre EXACTEMENT: une nouvelle reference morte fait rougir, et corriger l'une des deux
 * oblige a retirer sa ligne. La derive devient visible au lieu d'etre silencieuse.
 *
 * ⚖️ CE QUE CE TEST NE FAIT PAS. Il ne juge pas ce que le paquet EXPEDIE. Mesure du meme jour, dite
 * ici parce qu'elle est du meme dossier: `package.json#files` embarque `contracts/Main.compiled.json`
 * — que RIEN ne lit — pendant que `compile.js` ecrit et `deploy-token.js` lit
 * `scripts/main-token.compiled.json`, qui n'est ni suivi par git ni expedie. Un utilisateur du
 * tarball a donc les deux scripts et pas leur artefact. Corriger cela est une decision d'empaquetage.
 *
 * Run: node --test test/named-paths-exist.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');

/* Les fichiers qui parlent a un humain: scripts et binaires. On ne scanne pas les tests (ils citent
 * des chemins fictifs a dessein) ni la doc (un CHANGELOG cite legitimement des noms d'hier). */
const DOSSIERS = ['scripts', 'bin'];

/** Chaque mention d'un chemin de script du depot, quel que soit son contexte (chaine ou commentaire). */
function mentions(src) {
  const out = new Set();
  /* ⚠️ L EXTENSION EST ANCREE EN FIN, et ce n est pas un detail: sans `(?![A-Za-z0-9])`, le `.js` de
   * `.json` matche et le scan invente deux chemins morts (`main-token.compiled.js`,
   * `main-token.deployed.js`) qui n ont jamais ete nommes nulle part. Mesure du 2026-08-15: la liste
   * explicite a rougi et a designe MON extracteur, pas le depot. */
  for (const m of src.matchAll(/(?:^|[\s'"`(])((?:scripts|bin)\/[A-Za-z0-9._-]+\.(?:js|cjs|mjs))(?![A-Za-z0-9])/g)) out.add(m[1]);
  return out;
}

/* LES REFERENCES MORTES ASSUMEES — chaque ligne est une decision, pas un oubli. Etat fige 2026-08-15. */
const MORTES_ASSUMEES = {
  'scripts/compile-main-token.js':
    "nomme par le message d'erreur de scripts/deploy-token.js quand l'artefact manque; le script "
    + "s'appelle scripts/compile.js. ⛔ deploy-token.js DEPLOIE et SIGNE — corriger sa chaine est un "
    + "geste d'operateur, pas une correction d'audit.",
  'scripts/deploy-main-token.js':
    "nomme par l'en-tete d'usage de scripts/deploy-token.js; le fichier est scripts/deploy-token.js. "
    + 'Meme raison: ce fichier signe.',
};

const trouvees = new Map();          // chemin nomme → fichiers qui le nomment
for (const d of DOSSIERS) {
  const dir = path.join(RACINE, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => /\.(js|cjs|mjs)$/.test(x))) {
    const rel = d + '/' + f;
    for (const p of mentions(fs.readFileSync(path.join(dir, f), 'utf8'))) {
      if (!trouvees.has(p)) trouvees.set(p, []);
      trouvees.get(p).push(rel);
    }
  }
}

test('CONTRE-BORNE — le scan voit un nombre non trivial de chemins, et des chemins VALIDES', () => {
  /* Sans elle, un scan qui ne lirait rien rendrait « aucune reference morte » et passerait vert en
   * n'ayant rien regarde. On exige aussi qu'il voie des chemins qui EXISTENT: un scan qui ne
   * trouverait QUE les deux morts serait tout aussi suspect. */
  assert.ok(trouvees.size >= 3, 'seulement ' + trouvees.size + ' chemin(s) vu(s) — le scan ne lit presque rien');
  const vivants = [...trouvees.keys()].filter((p) => fs.existsSync(path.join(RACINE, p)));
  assert.ok(vivants.length >= 1,
    'aucun chemin VALIDE vu (' + [...trouvees.keys()].join(' ') + ') — l extraction est probablement cassee');
});

test('★ tout chemin de script NOMME existe — ou figure dans la liste justifiee', () => {
  const mortes = [...trouvees.keys()].filter((p) => !fs.existsSync(path.join(RACINE, p))).sort();
  const assumees = Object.keys(MORTES_ASSUMEES).sort();
  assert.deepEqual(mortes, assumees,
    'references a des scripts INEXISTANTS.\n       trouve : ' + (mortes.join(' ') || '(aucune)')
    + '\n       liste  : ' + assumees.join(' ')
    + '\n       ⇒ Une EN PLUS = un message dit a l utilisateur de lancer un script qui n existe pas.'
    + '\n         Une EN MOINS = elle a ete corrigee: retirer sa ligne de MORTES_ASSUMEES.');
});

test('★ chaque reference morte assumee est encore NOMMEE quelque part', () => {
  /* Une entree qui ne correspond plus a rien masquerait une vraie derive: la liste doit suivre la
   * realite dans les DEUX sens. */
  for (const p of Object.keys(MORTES_ASSUMEES)) {
    assert.ok(trouvees.has(p),
      p + ' est declare mort-assume et plus personne ne le nomme — retirer sa ligne, sinon la liste '
      + 'protege une derive qui n existe plus et en cache une qui existe.');
    assert.ok(MORTES_ASSUMEES[p].length > 40, p + ': la justification doit dire POURQUOI on ne corrige pas');
  }
});

test('★ la porte MORD — un chemin inexistant supplementaire serait detecte', () => {
  const faux = "  console.error('run: node scripts/qui-nexiste-pas.js');";
  const vus = [...mentions(faux)];
  assert.deepEqual(vus, ['scripts/qui-nexiste-pas.js'], 'l extraction doit voir un chemin dans une chaine');
  assert.ok(!fs.existsSync(path.join(RACINE, vus[0])), 'et ce chemin ne doit pas exister');
});
