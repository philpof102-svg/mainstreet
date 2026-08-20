// badges-carry-no-frozen-count.test.js
// ================================================================================================
// Le README portait `tests-21%2F21`, une image shields.io dont le nombre est écrit EN DUR et qui
// pointait vers `test/oracle.test.js` seul. Mesuré le 2026-08-20 : `npm test` en exécute **123**
// (128 depuis). Le badge affichait 21 depuis le jour où quelqu'un a compté un seul fichier.
//
// ⛔ POURQUOI ON NE L'A PAS « MIS À JOUR ». Écrire 128 recrée exactement le même défaut : un chiffre
// d'ÉTAT COURANT dans un artefact que rien ne recalcule pourrit dès le test suivant, et il pourrit
// en SILENCE — une image verte affirmant un nombre faux inspire plus confiance qu'une absence.
// Le badge CI juste au-dessus, lui, est dynamique et dit déjà ce qui compte : la suite passe ou non.
//
// La même famille a déjà coûté ici : une fiche de passation annonçait « 38 tests » pour ce dépôt
// alors qu'il en exécutait 123 — un chiffre recopié de note en note ne redevient pas vrai.
//
// ⛔ BORNE : ce gate interdit un COMPTE figé dans un badge. Il ne vérifie pas que les autres badges
// disent vrai (Sourcify, npm, leaderboard sont des états tiers), et il ne compte pas les tests.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

test('témoin : le scanner lit bien un README qui contient des badges', () => {
  const r = lire('README.md');
  assert.ok(r.length > 1000, 'README non vide');
  assert.ok(/img\.shields\.io\/badge\//.test(r), 'il contient bien des badges shields.io — sinon ce gate ne mesure rien');
});

test('aucun badge ne fige un compte de tests', () => {
  const r = lire('README.md');
  const figes = r.match(/badge\/tests-\d[^)\s]*/g) || [];
  assert.deepStrictEqual(figes, [],
    'badge(s) à compte figé: ' + figes.join(', ') + '. Un nombre écrit en dur dans une image que rien '
    + 'ne recalcule pourrit en silence — et une image VERTE portant un nombre faux inspire plus '
    + 'confiance qu\'une absence. Le badge CI est dynamique et suffit.');
});

test('DETECTION POWER : le motif interdit est reconnu, et LUI SEUL', () => {
  // Sans ça, la regex pourrait ne rien matcher par erreur et le gate passerait sur n'importe quoi.
  // 🪤 Premier jet : `tests-[^)\s]*\d` — trop large. Elle attrapait `tests-npm%20test-3fb950`,
  // dont les seuls chiffres sont l'encodage de l'espace et le code couleur. Un détecteur qui se
  // laisse déclencher mais pas trier est pire qu'inutile ; c'est le cas OPPOSÉ ci-dessous qui l'a
  // révélé, pas le cas positif.
  const faux = '[![Tests](https://img.shields.io/badge/tests-21%2F21-3fb950)](test/oracle.test.js)';
  assert.ok((faux.match(/badge\/tests-\d[^)\s]*/g) || []).length === 1,
    'la forme exacte qui vivait dans le README doit être attrapée');
  const bon = '[![Tests](https://img.shields.io/badge/tests-npm%20test-3fb950)](package.json)';
  assert.ok((bon.match(/badge\/tests-\d[^)\s]*/g) || []).length === 0,
    'et la forme sans chiffre doit passer');
});
