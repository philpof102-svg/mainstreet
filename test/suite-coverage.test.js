'use strict';
/**
 * Un fichier de test qui n'est lance par personne ne garde rien.
 *
 * ⛔ CE QUE CETTE PORTE A TROUVE EN NAISSANT, le 2026-08-06. `test/sdk.test.js` existait, portait
 * QUATORZE assertions sur le SDK publie — celui que les utilisateurs importent — et n'etait reference
 * ni par `npm test` ni par la CI. Les deux nommaient `test/oracle.test.js` en dur. Le fichier passait
 * (14/14 au moment de la decouverte), donc rien ne signalait quoi que ce soit: il ne s'agissait pas
 * d'un test casse, mais d'un test ABSENT du chemin d'execution, ce qui est plus discret et pire.
 * Casser `sdk/` laissait `npm test` vert.
 *
 * ⚠️ ET LA CAUSE N'ETAIT PAS L'OUBLI, C'ETAIT LA DUPLICATION. Le workflow CI recopiait la liste des
 * fichiers au lieu d'appeler `npm test`. Deux listes qui disent la meme chose divergent toujours, et
 * celle qu'on oublie est celle qui ne tourne pas sur son poste. La porte verifie donc les DEUX: aucun
 * fichier orphelin, et la CI passe par le script plutot que de le reecrire.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));
const scriptTest = PKG.scripts.test || '';
const tousScripts = Object.values(PKG.scripts || {}).join(' && ');

/* ⛔ LA DETECTION NE DOIT PAS DEPENDRE DU SUFFIXE — mesure du 2026-08-17.
 * Cette porte filtrait `f.endsWith('.test.js')`. Un fichier depose dans `test/` sans ce suffixe lui
 * etait donc STRICTEMENT INVISIBLE: elle ne pouvait ni l'accuser ni l'absoudre, elle ne le voyait
 * pas. Mesure du jour: 18 fichiers `.js` dans `test/`, 17 vus, 1 invisible
 * (`published-package-drift.js`) — et il n'est lance par `npm test` dans aucun cas. Aujourd'hui
 * c'est legitime, il est cable sur `test:published`; mais la porte ne savait pas faire cette
 * difference, elle ne regardait simplement pas. `biii` porte la version sans filtre depuis le
 * 2026-07-26 et nomme ce cas exactement. Un test qui n'a pas de suffixe garde tout autant zero. */
/* Le predicat est NOMME pour pouvoir etre eprouve directement. Le tester a travers la liste deja
 * filtree ne prouverait rien: on y injecterait un nom qui contourne le filtre au lieu de le
 * traverser. Constate en ecrivant ce correctif — le cas « LE FILTRE » passait au vert avec le
 * mauvais filtre en place, et c'est la garde anti-fantome qui a attrape la regression. */
const estFichierDeTest = (f) => /\.(c|m)?js$/.test(f) && !f.startsWith('_');
const fichiers = fs.readdirSync(__dirname).filter(estFichierDeTest);

/**
 * ⛔ LES FICHIERS LANCES SUR DEMANDE SEULEMENT, declares avec leur raison.
 * « Cable sur un script npm » n'est pas « lance par la suite »: un gate reseau ne tourne a AUCUN
 * commit ordinaire. Le declarer est une DECISION, pas un effet de bord de nommage — et une entree
 * qui pourrit est detectee plus bas.
 */
const SUR_DEMANDE = {
  /* ⚠️ Ne PAS y mettre un fichier qui EST dans la chaine: la garde anti-fantome ci-dessous le
   * refuse, et elle a raison — une declaration qui ne correspond a rien autorise du vide. Constate
   * en ecrivant ce correctif: j y avais inscrit `suite-coverage.test.js`, qui tourne pourtant. */
  'published-package-drift.js':
    'telecharge le TARBALL PUBLIE et le compare fichier par fichier a cet arbre. Dependance reseau: '
    + 'dans la suite elle la rendrait rouge pour des motifs qui ne sont pas le code. Sa question est '
    + '« qu est-ce que recoivent les INSTALLATEURS ? » — mesure du 2026-08-16: 11 fichiers expedies '
    + 'different du publie, dont sdk/verifier.js et son correctif fail-closed. Lance par '
    + '`npm run test:published`.',
};

test('aucun fichier de test n est orphelin', () => {
  /* Un succes VIDE serait le meme defaut d'un cran plus haut: si la lecture du dossier rend zero
   * fichier, la porte passerait en n'ayant rien verifie. */
  assert.ok(fichiers.length >= 2,
    'succes vide: ' + fichiers.length + ' fichier(s) de test lu(s) — la porte ne lit plus rien');

  const orphelins = fichiers.filter((f) => !(f in SUR_DEMANDE) && !tousScripts.includes('test/' + f));
  assert.deepStrictEqual(orphelins, [],
    'fichier(s) de test qu AUCUN script npm ne lance: ' + JSON.stringify(orphelins)
    + '\n  Un test hors du chemin d execution ne garde rien, et il passe silencieusement pour vert.'
    + '\n  Les inscrire dans la chaine `test` — ou dans SUR_DEMANDE AVEC leur raison.');
});

test('chaque fichier hors de `npm test` est DECLARE, et aucune declaration ne pourrit', () => {
  /* Deux couvertures, jamais confondues: ce que la suite lance a chaque commit, et ce qui ne tourne
   * qu a la demande. Un seul chiffre laisserait lire « couvert » comme « tourne a chaque commit ». */
  const horsSuite = fichiers.filter((f) => !scriptTest.includes('test/' + f));
  const nonDeclares = horsSuite.filter((f) => !(f in SUR_DEMANDE));
  assert.deepStrictEqual(nonDeclares, [],
    'fichier(s) absent(s) de `npm test` et non declare(s) dans SUR_DEMANDE: ' + JSON.stringify(nonDeclares));

  const fantomes = Object.keys(SUR_DEMANDE).filter((f) => !horsSuite.includes(f));
  assert.deepStrictEqual(fantomes, [],
    'declaration(s) SUR_DEMANDE qui ne correspondent plus a un fichier hors-suite: ' + JSON.stringify(fantomes)
    + '\n  Une entree morte autorise du vide et masquerait un vrai orphelin.');

  for (const [nom, raison] of Object.entries(SUR_DEMANDE)) {
    assert.ok(typeof raison === 'string' && raison.length > 40, 'declaration sans raison ecrite: ' + nom);
  }
});

test('LE FILTRE NE DEPEND PAS DU SUFFIXE — un orphelin sans `.test.js` est vu', () => {
  /* Le defaut corrige le 2026-08-17: la porte ne lisait que `*.test.js`. On rejoue la MEME regle sur
   * une entree fabriquee sans suffixe — si elle ressort invisible, le filtre a regresse. */
  /* On eprouve le PREDICAT, pas la liste: l injecter dans `fichiers` le contournerait. */
  assert.ok(estFichierDeTest('gate-sans-suffixe.js'),
    'un fichier `.js` sans suffixe `.test.js` n est pas reconnu comme fichier de test — le filtre a regresse');
  assert.ok(estFichierDeTest('quelque-chose.test.js'), 'et le cas OPPOSE doit rester vrai');
  assert.ok(estFichierDeTest('outil.cjs') && estFichierDeTest('outil.mjs'), 'cjs/mjs comptent aussi');
  /* Bornes: ce qui ne doit PAS etre pris pour un test, sinon la porte accuserait des fixtures. */
  assert.ok(!estFichierDeTest('_helper.js'), 'la convention `_` reste exclue');
  assert.ok(!estFichierDeTest('donnees.json'), 'un fichier non-JS n est pas un test');
});

test('la porte MORD — un orphelin simule est detecte', () => {
  /* Le cas oppose, sur une copie en memoire: sans lui, une porte qui ne trouve jamais rien passerait
   * exactement comme une porte qui fonctionne. */
  /* On retire un fichier REELLEMENT dans la chaine — depuis que le filtre voit tous les `.js`,
   * `fichiers[0]` peut etre un gate hors-suite, et la mutation ne prouverait alors rien. */
  const dansLaSuite = fichiers.filter((f) => scriptTest.includes('test/' + f));
  assert.ok(dansLaSuite.length > 0, 'succes vide: aucun fichier de la chaine — rien a muter');
  const cible = dansLaSuite[0];
  const tousAmpute = tousScripts.replace('test/' + cible, 'test/inexistant.js');
  assert.notStrictEqual(tousAmpute, tousScripts, 'la mutation ne s est pas appliquee — rien n est prouve');
  const orphelins = fichiers.filter((f) => !(f in SUR_DEMANDE) && !tousAmpute.includes('test/' + f));
  assert.deepStrictEqual(orphelins, [cible], 'la porte doit nommer le fichier retire');
});

test('la CI passe par `npm test` au lieu de recopier la liste', () => {
  /* La duplication est la cause reelle: c'est en recopiant les noms de fichiers que la CI a cesse de
   * suivre le script. Une seule source de verite, et cette porte la protege. */
  const ci = fs.readFileSync(path.join(RACINE, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.ok(/run:\s*npm (run )?test/.test(ci),
    'le workflow doit lancer `npm test`, sinon sa liste de fichiers derive de celle de package.json');
  const enDur = [...ci.matchAll(/node --test\s+(test\/\S+)/g)].map((m) => m[1]);
  assert.deepStrictEqual(enDur, [],
    'le workflow nomme encore des fichiers de test en dur: ' + JSON.stringify(enDur)
    + '\n  C est exactement ainsi que `test/sdk.test.js` a cesse de tourner.');
});
