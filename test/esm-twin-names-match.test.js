'use strict';
/**
 * LE JUMEAU ESM PORTE-T-IL LES MEMES NOMS ? — `package.json#exports` sert deux fichiers differents.
 *
 * Pour `require(...)` le paquet sert sdk/index.js et sdk/tools.js. Pour `import ...` il sert
 * sdk/index.mjs et sdk/tools.mjs, et ces deux-la n'ont RIEN d'un re-export automatique: ils
 * enumerent les noms A LA MAIN (29 lignes `export const` dans index.mjs, une destructuration de 13
 * noms dans tools.mjs). Une liste ecrite a la main ne suit pas le module qu'elle recopie.
 *
 * CE QUI ETAIT DEJA GARDE, ET CE QUI NE L'ETAIT PAS. `types-match-runtime.test.js` confronte les
 * .d.ts publies au runtime — mais par `require`, donc au CJS seul. Il restait donc:
 *     .d.ts <-> CJS   garde
 *     .d.ts <-> ESM   non garde
 *     CJS   <-> ESM   non garde
 * Or c'est le MEME .d.ts qui sert aux deux. Un nom ajoute au CJS et oublie dans le .mjs est declare
 * par les types, valide par l'editeur, et introuvable a l'import: exactement la severite FANTOME
 * que le gate des types interdit, sur la seule route qu'il ne regarde pas.
 *
 * DEUX DIRECTIONS, DEUX SEVERITES — et elles ne sont pas symetriques:
 *   FANTOME    nomme dans le .mjs, absent du CJS. Bruyant par construction: `sdk.foo.bind(sdk)` jette
 *              A L'IMPORT si `foo` disparait, donc le module ne se charge meme pas. Interdit quand
 *              meme, parce qu'une forme d'export future (destructuration, comme tools.mjs) rend le
 *              meme oubli SILENCIEUX: `const { absent } = tools` vaut undefined sans rien dire.
 *   INVISIBLE  exporte en CJS, jamais nomme cote ESM. C'est la direction dangereuse et muette: le
 *              consommateur ESM ne peut pas l'importer, et rien ne le lui dit. LISTE EXPLICITE
 *              justifiee ligne par ligne (convention `suite-coverage` / `types-match-runtime`):
 *              declarer ou non reste un choix d'API, ce test exige seulement qu'il soit ECRIT.
 *
 * ⚖️ BORNES. Recensement de NOMS et de TYPES, jamais de signatures ni de comportement: un `.mjs` qui
 * nommerait les bons symboles en pointant vers les mauvaises fonctions passerait ici. Et l'identite
 * des fonctions n'est pas comparable — `.bind(sdk)` fabrique un nouvel objet fonction a chaque nom.
 *
 * ETAT MESURE le 2026-08-15: parite EXACTE sur les deux paires, listes d'invisibles VIDES. Ce gate
 * n'a donc corrige aucun bug le jour ou il est ne — il empeche celui de la prochaine methode ajoutee.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const RACINE = path.join(__dirname, '..');

/** Les noms qu'un module CJS expose VRAIMENT, tous types confondus. */
const nomsCjs = (mod) => new Set(Object.keys(require(path.join(RACINE, mod))));

/** Les noms qu'un module ESM expose, `default` compris — c'est un nom importable comme un autre. */
const nomsEsm = async (mod) => new Set(Object.keys(await import(pathToFileURL(path.join(RACINE, mod)).href)));

/** Les noms portes des deux cotes dont la NATURE differe. Extrait pour etre prouve mordant. */
const divergences = (a, b, noms) => (noms || Object.keys(b).filter((n) => n !== 'default' && n in a))
  .filter((n) => typeof a[n] !== typeof b[n])
  .map((n) => n + ' (cjs=' + typeof a[n] + ' esm=' + typeof b[n] + ')')
  .sort();

/* LES INVISIBLES ASSUMES — chaque ligne est une decision, pas un oubli. Etat fige le 2026-08-15:
 * les deux paires sont a parite, donc les deux listes sont vides. Une liste vide n'est pas un
 * relachement ici: le test exige l'EGALITE avec le reel, donc le premier export oublie la fera
 * rougir au lieu de s'y glisser. */
const PAIRES = [
  { cjs: 'sdk/index.js', esm: 'sdk/index.mjs', invisibles: {} },
  { cjs: 'sdk/tools.js', esm: 'sdk/tools.mjs', invisibles: {} },
];

test('VALIDATION DE L INSTRUMENT — il compte les noms, pas seulement les fonctions', async () => {
  /* ⚠️ LE CAS QUI A FAIT NAITRE CETTE VALIDATION. La premiere version de cette sonde ne retenait que
   * les valeurs `function` ou `string`, et annoncait 6 ecarts sur tools — or les 6 (`scoreSpec` et
   * consorts) sont des OBJETS, bien presents des deux cotes. Le chiffre venait du filtre, pas du
   * paquet. Un lecteur qui trie par TYPE fabrique des ecarts; celui-ci doit voir un objet. */
  const cjs = nomsCjs('sdk/tools.js');
  assert.ok(cjs.has('scoreSpec'), 'temoin OBJET: `scoreSpec` est un objet exporte par tools.js — un '
    + 'lecteur qui filtre sur typeof function le manquerait et inventerait un ecart');
  assert.ok(cjs.has('openai'), 'temoin FONCTION: `openai` doit etre vu aussi');
  assert.ok(!cjs.has('symboleQuiNExistePas'), 'temoin NEGATIF: le lecteur sait aussi dire non');
  assert.ok(cjs.size >= 8, 'succes vide: seulement ' + cjs.size + ' nom(s) lus dans tools.js');

  const esm = await nomsEsm('sdk/tools.mjs');
  assert.ok(esm.has('scoreSpec'), 'temoin cote ESM: la destructuration nomme bien `scoreSpec`');
  assert.ok(esm.has('default'), '`default` compte comme un nom importable');
  assert.ok(esm.size >= 8, 'succes vide cote ESM: ' + esm.size + ' nom(s)');
});

for (const { cjs, esm, invisibles } of PAIRES) {
  test(esm + ' — aucun FANTOME: tout nom ESM existe cote CJS', async () => {
    const nC = nomsCjs(cjs);
    const nE = await nomsEsm(esm);
    const fantomes = [...nE].filter((n) => !nC.has(n)).sort();
    assert.deepEqual(fantomes, [],
      esm + ' nomme des symboles absents de ' + cjs + '. Sous la forme `x.foo.bind(x)` cela jette a '
      + 'l import; sous la forme destructuree de tools.mjs cela vaut undefined SANS RIEN DIRE: '
      + fantomes.join(', '));
  });

  test(esm + ' — chaque INVISIBLE est un choix ecrit, pas un oubli', async () => {
    const nC = nomsCjs(cjs);
    const nE = await nomsEsm(esm);
    const invisiblesReels = [...nC].filter((n) => !nE.has(n)).sort();
    assert.deepEqual(invisiblesReels, Object.keys(invisibles).sort(),
      cjs + ' exporte des noms que ' + esm + ' ne sert pas. C est la direction MUETTE: le .d.ts les '
      + 'declare (il est valide contre le CJS), l editeur les propose, et l import ne les trouve pas. '
      + 'Les ajouter au .mjs — ou les inscrire dans INVISIBLES_ASSUMES avec la raison.');
  });

  test(esm + ' — un nom commun garde le meme TYPE des deux cotes', async () => {
    const modC = require(path.join(RACINE, cjs));
    const modE = await import(pathToFileURL(path.join(RACINE, esm)).href);
    const communs = Object.keys(modE).filter((n) => n !== 'default' && n in modC);
    assert.ok(communs.length >= 5, 'succes vide: seulement ' + communs.length + ' nom(s) commun(s)');

    /* ⚠️ LA PORTE MORD-ELLE ? Aujourd'hui les deux .mjs tirent leurs valeurs du .js, donc les types
     * coincident PAR CONSTRUCTION et cette comparaison ne peut pas rougir sur les fichiers reels.
     * Un test qui ne peut que passer ressemble a une couverture sans en etre une — alors on prouve
     * ici, sur une paire fabriquee, que la comparaison sait dire NON. Elle mordra le jour ou un .mjs
     * ecrira une valeur A LA MAIN au lieu de la reprendre au .js, ce qui est la forme naturelle de
     * la derive suivante. */
    assert.deepEqual(divergences({ a: () => {} }, { a: () => {} }), [], 'temoin: deux fonctions concordent');
    assert.deepEqual(divergences({ a: () => {} }, { a: 'texte' }), ['a (cjs=function esm=string)'],
      'la comparaison doit reperer une nature differente sous le meme nom');

    assert.deepEqual(divergences(modC, modE, communs), [],
      'meme nom, nature differente selon la route d import — un consommateur qui passe de require a '
      + 'import verrait son appel changer de sens');
  });
}
