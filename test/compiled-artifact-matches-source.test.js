'use strict';
/**
 * LE TARBALL EXPEDIE UN ARTEFACT COMPILE QUE RIEN NE REGENERE — CETTE PORTE EST SON SEUL GARDIEN.
 *
 * `package.json#files` expedie `contracts/Main.compiled.json` (abi + bytecode) A COTE de
 * `contracts/Main.sol`. Mesure du 2026-08-16: AUCUN chemin du depot n'ecrit ce fichier —
 * `scripts/compile.js` ecrit `scripts/main-token.compiled.json`, un JUMEAU non suivi et non expedie,
 * et le seul autre fichier qui nomme l'artefact est un test d'existence. La parite constatee
 * aujourd'hui (source embarquee === Main.sol, sha fb1f7687, 2454 caracteres) est donc une
 * COINCIDENCE D'HISTOIRE, pas une propriete: le jour ou quelqu'un edite Main.sol sans reconstruire
 * l'artefact a la main, le paquet expedie l'ABI et le bytecode d'un AUTRE contrat que la source
 * posee a cote — et un consommateur qui deploie l'artefact en lisant le .sol comme reference est
 * trompe sans un bruit. C'est parity-proved-once-is-not-a-gate, en binaire.
 *
 * L'ANCRE NE DEMANDE PAS SOLC: l'artefact embarque sa propre source (`compiled.source`), posee par
 * le meme flux de compilation que l'abi et le bytecode. Si `compiled.source` === `Main.sol` octet
 * pour octet, l'abi/bytecode expedies decoulent bien de la source expediee (au compilateur pres,
 * dont la version voyage dans `compiled.compiler.version`).
 *
 * ⚖️ BORNES, dites plutot que cachees:
 *   · cette porte prouve la parite SOURCE<->ARTEFACT, pas que le bytecode est correct — ca, seul le
 *     compilateur le prouve, et on ne l'execute pas ici (l'installer n'est pas un geste de test);
 *   · le jumeau `scripts/main-token.compiled.json` reste NON SUIVI et NON expedie — on ne gate pas un
 *     fichier hors du depot; sa reconciliation avec l'artefact expedie est une decision d'operateur
 *     (compile.js et le tarball ne visent aujourd'hui PAS le meme fichier, et cette porte ne le
 *     repare pas — elle empeche seulement l'artefact expedie de mentir sur sa source).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const compiled = JSON.parse(fs.readFileSync(path.join(RACINE, 'contracts', 'Main.compiled.json'), 'utf8'));
const sol = fs.readFileSync(path.join(RACINE, 'contracts', 'Main.sol'), 'utf8');

test('la source embarquee dans l artefact EST Main.sol, octet pour octet', () => {
  /* Succes vide d'abord: deux vides seraient "egaux" et la porte n'aurait rien compare. */
  assert.ok(sol.length > 100, 'succes vide: Main.sol fait ' + sol.length + ' caracteres');
  assert.strictEqual(typeof compiled.source, 'string', 'l artefact doit porter sa source');
  if (compiled.source !== sol) {
    const a = compiled.source.split('\n');
    const b = sol.split('\n');
    let ligne = 0;
    while (ligne < Math.max(a.length, b.length) && a[ligne] === b[ligne]) ligne++;
    assert.fail('l artefact expedie a ete compile depuis une AUTRE source que le Main.sol expedie — '
      + 'premiere divergence ligne ' + (ligne + 1) + ':\n  artefact: ' + JSON.stringify((a[ligne] || '').slice(0, 90))
      + '\n  Main.sol: ' + JSON.stringify((b[ligne] || '').slice(0, 90))
      + '\nRecompiler et recopier l artefact expedie fait partie du MEME changement que l edition du contrat.');
  }
});

test('l artefact a la forme d un artefact: abi non vide, bytecodes hex non triviaux', () => {
  assert.ok(Array.isArray(compiled.abi) && compiled.abi.length > 0, 'abi vide');
  for (const champ of ['bytecode', 'deployedBytecode']) {
    const v = String(compiled[champ] || '');
    assert.match(v, /^0x[0-9a-fA-F]+$/, champ + ' n est pas un hex 0x');
    assert.ok(v.length > 200, champ + ' trop court pour un contrat reel: ' + v.length + ' caracteres');
  }
});

test('la version du compilateur voyage avec l artefact — un bytecode sans version ne se rejoue pas', () => {
  const v = compiled.compiler && compiled.compiler.version;
  assert.ok(typeof v === 'string' && /\d+\.\d+\.\d+/.test(v),
    'compiler.version absente ou informe: ' + JSON.stringify(v));
});
