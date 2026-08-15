'use strict';
/**
 * LES .d.ts PUBLIES DISENT-ILS VRAI ? — le tarball promet des types; personne ne les confrontait au runtime.
 *
 * `package.json#exports` route les types de `.`, `./sdk` et `./tools` vers trois .d.ts, et `npm pack`
 * confirme qu'ils PARTENT dans le tarball. Mais aucun test ne comparait ce qu'ils DECLARENT a ce que
 * les modules EXPORTENT. C'est `untested-export-silent-break`, version types: un symbole declare mais
 * absent au runtime ne casse rien ici — il casse chez le consommateur TypeScript, a l'autocompletion
 * pres, au moment de l'appel.
 *
 * Deux directions, deux severites:
 *   FANTOME    declare dans le .d.ts, absent au runtime  -> INTERDIT. Le consommateur TS ecrit un appel
 *              que l'editeur valide et que le runtime crashe. Aucune exception possible.
 *   INVISIBLE  exporte au runtime, absent du .d.ts       -> LISTE EXPLICITE justifiee, ligne par ligne
 *              (la convention suite-coverage). Declarer ou non est un choix d'API — pas celui de ce
 *              test. Il exige seulement que le choix soit ECRIT: un nouvel export non declare rougit,
 *              et un invisible qui disparait rougit aussi (la liste doit suivre la realite).
 *
 * ⚖️ BORNES. La comparaison porte sur les exports VALEUR (const/function/class): les interfaces et
 * types s'effacent au runtime et ne peuvent pas etre confrontes ici. Et rien n'est verifie des
 * SIGNATURES — un .d.ts qui declare les bons noms avec les mauvais parametres passe ce gate. C'est un
 * recensement de NOMS, pas un typecheck; `tsc` ferait mieux, au prix d'une dependance que ce depot n'a pas.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');

/* Extraction des exports VALEUR d'un .d.ts. Volontairement bete: `export [declare] const|function|class X`
 * et `export { X, Y as Z }`. Un .d.ts qui passerait a des formes plus exotiques (namespace, re-export
 * d'un autre fichier) echapperait a ce recensement — dit ici plutot que decouvert plus tard. */
function declares(cheminDts) {
  const txt = fs.readFileSync(cheminDts, 'utf8');
  const noms = new Set();
  for (const m of txt.matchAll(/export\s+(?:declare\s+)?(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)) noms.add(m[1]);
  for (const m of txt.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0].trim(); if (n) noms.add(n); }
  }
  return noms;
}

/* LES INVISIBLES ASSUMES — chaque ligne est une decision, pas un oubli. Les retirer du runtime ou les
 * declarer dans le .d.ts doit faire bouger CETTE liste, exprès. Etat fige le 2026-08-15. */
const INVISIBLES_ASSUMES = {
  'types/oracle.d.ts': {
    module: 'oracle.js',
    invisibles: {
      computeActivityScore: 'exporte au runtime, jamais declare — le declarer en ferait une API publique '
        + 'promise; le retirer casserait un consommateur JS existant. Choix a trancher par l operateur.',
    },
  },
  'sdk/index.d.ts': {
    module: 'sdk/index.js',
    invisibles: {
      buildReceiptMessage: 'DOCUMENTE par son propre JSDoc (exemple d appel ligne ~262) mais absent du '
        + '.d.ts — le .d.ts est en retard sur l API. Le declarer est le geste naturel; il ajoute une '
        + 'promesse publique, donc il reste un choix d operateur.',
      default: 'interop CJS/ESM (`module.exports.default = sdk`). Le declarer changerait la forme du '
        + 'module pour les consommateurs TS en mode esModuleInterop — pas un simple ajout de nom.',
    },
  },
  'sdk/tools.d.ts': {
    module: 'sdk/tools.js',
    invisibles: {
      default: 'meme interop CJS/ESM que sdk/index.js, meme raison.',
    },
  },
};

test('VALIDATION DE L INSTRUMENT — l extraction sait dire oui ET non', () => {
  const decl = declares(path.join(RACINE, 'types/oracle.d.ts'));
  assert.ok(decl.has('attest'), 'temoin positif: `attest` est declare dans oracle.d.ts');
  assert.ok(decl.has('ORACLE_VERSION'), 'temoin positif: une const aussi');
  assert.ok(!decl.has('SubjectType'), 'un `export type` ne doit PAS compter — il s efface au runtime');
  assert.ok(!decl.has('AgentMetrics'), 'une interface non plus');
  assert.ok(decl.size >= 8, 'succes vide: ' + decl.size + ' declarations seulement');
});

for (const [dts, { module: mod, invisibles }] of Object.entries(INVISIBLES_ASSUMES)) {
  test(dts + ' — aucun FANTOME: tout ce qui est declare existe au runtime', () => {
    const decl = declares(path.join(RACINE, dts));
    const reel = new Set(Object.keys(require(path.join(RACINE, mod))));
    const fantomes = [...decl].filter((n) => !reel.has(n));
    assert.deepEqual(fantomes, [],
      dts + ' declare des symboles ABSENTS du runtime — un consommateur TS ecrira un appel que '
      + 'l editeur valide et que le runtime crashe: ' + fantomes.join(', '));
  });

  test(dts + ' — chaque INVISIBLE est un choix ecrit, pas un oubli', () => {
    const decl = declares(path.join(RACINE, dts));
    const reel = new Set(Object.keys(require(path.join(RACINE, mod))));
    const invisiblesReels = [...reel].filter((n) => !decl.has(n)).sort();
    const assumes = Object.keys(invisibles).sort();
    assert.deepEqual(invisiblesReels, assumes,
      'les exports non declares de ' + mod + ' doivent etre EXACTEMENT ceux de la liste justifiee — '
      + 'un nouvel export non declare est une derive, un assume disparu est une liste perimee');
  });
}
