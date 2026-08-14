'use strict';
/**
 * Les exemples publies doivent pouvoir DEMARRER — ce sont les premiers pas d'un utilisateur.
 *
 * `package.json` embarque `examples/` en entier dans le tarball npm. Aucun n'avait jamais ete
 * lance. Mesure du 2026-08-15, deux defauts:
 *
 *  1. CINQ EXEMPLES ETAIENT EN SYNTAXE ESM DANS UN FICHIER `.js`, alors que ce paquet est
 *     CommonJS (`package.json` n'a pas de `"type"`). Node moderne les rattrape en reparsant en
 *     module — il l'annonce lui-meme: « Module type of ... is not specified and it doesn't parse
 *     as CommonJS. Reparsing as ES module ». Sans ce repli, mesure avec
 *     `--no-experimental-detect-module`: « SyntaxError: Cannot use import statement outside a
 *     module ». Le paquet declare `engines: >=20`; a partir de quelle version mineure ce repli
 *     existe n'a PAS ete mesure ici — et l'extension `.mjs` rend la question sans objet, ce qui est
 *     precisement pourquoi elle a ete choisie plutot qu'un pari sur la version.
 *
 *  2. LA GARDE « STANDALONE DEMO » ETAIT FAUSSE SUR WINDOWS. Les cinq comparaient
 *     `import.meta.url` a `` `file://${process.argv[1]}` ``. Mesure sur win32:
 *       import.meta.url            file:///D:/.../exemple.mjs
 *       `file://` + argv[1]        file://D:\...\exemple.mjs      -> egal ? FALSE
 *       pathToFileURL(argv[1]).href file:///D:/.../exemple.mjs    -> egal ? TRUE
 *     La concatenation ne donne une URL valide que si le chemin commence par « / », ce qui est le
 *     cas sur POSIX ('file://' + '/home/u/x.mjs' === 'file:///home/u/x.mjs') et jamais sur Windows.
 *     L'exemple sortait donc en code 0 SANS RIEN AFFICHER: la panne la plus discrete possible pour
 *     un fichier dont le seul role est de montrer quelque chose. Apres correction, le meme fichier
 *     produit 1888 octets la ou il en produisait 457, tous d'avertissement.
 *
 * ⚖️ BORNES. Cette porte verifie qu'un exemple DEMARRE, pas qu'il fait ce qu'il annonce: la plupart
 * appellent l'API vivante ou un framework tiers, et `sdk/index.js` ne lit pas `MAINSTREET_ORIGIN`
 * (il n'expose que `configure({origin})`), donc on ne peut pas les rediriger vers un stub par
 * l'environnement. Aucun exemple n'est EXECUTE ici — la garde n° 2 est verifiee sur la FORME, et la
 * mesure qui la justifie est datee ci-dessus.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'examples');
const fichiers = fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.js') || f.endsWith('.mjs')).sort();

/* Exemples que cette porte ne LANCE jamais. Liste explicite: chaque ligne se justifie. */
const JAMAIS_LANCES = new Map([
  ['x402-buyer.js', 'PAIE — signe une transaction USDC via x402-axios; ne doit etre execute par'
    + ' aucun test, seulement analyse'],
]);

test('le dossier examples est lu', () => {
  /* Temoin: une lecture vide ferait passer tous les autres tests sans rien verifier. */
  assert.ok(fichiers.length >= 10, 'succes vide: ' + fichiers.length + ' exemple(s) lu(s)');
  assert.ok(fichiers.includes('x402-buyer.js'), 'temoin: le dossier attendu doit etre celui-ci');
  const excusesMortes = [...JAMAIS_LANCES.keys()].filter((f) => !fichiers.includes(f));
  assert.deepEqual(excusesMortes, [], 'JAMAIS_LANCES excuse un fichier absent: ' + JSON.stringify(excusesMortes));
});

test('chaque exemple parse sous SA propre extension, sans le repli de Node', () => {
  /* `--no-experimental-detect-module` retire le rattrapage: un `.js` doit parser en CommonJS et un
   * `.mjs` en module. C'est exactement la difference qui separait « marche chez moi » de
   * « SyntaxError chez l'utilisateur ». */
  const casses = [];
  for (const f of fichiers) {
    try {
      execFileSync(process.execPath, ['--no-experimental-detect-module', '--check', path.join(DOSSIER, f)],
        { stdio: 'pipe' });
    } catch (e) {
      const msg = String(e.stderr || e.message).split('\n').filter((l) => /Error/.test(l))[0] || 'echec';
      casses.push(f + ': ' + msg.trim());
    }
  }
  assert.deepEqual(casses, [],
    'exemple(s) qui ne parsent pas sous leur extension:\n  ' + casses.join('\n  ')
    + '\n  Un fichier en syntaxe ESM doit s appeler .mjs dans ce paquet, qui est CommonJS.');
});

test('aucune garde « standalone demo » ne concatene file:// a un chemin', () => {
  const fautifs = [];
  for (const f of fichiers) {
    const src = fs.readFileSync(path.join(DOSSIER, f), 'utf8');
    /* On cherche la concatenation, pas l'idee: `file://` suivi d'une interpolation. */
    if (src.includes('`file://${')) fautifs.push(f);
  }
  assert.deepEqual(fautifs, [],
    'garde(s) qui comparent une URL a `file://` + un chemin: ' + JSON.stringify(fautifs)
    + '\n  Sur Windows argv[1] vaut `D:\\...` et la comparaison est TOUJOURS fausse: le bloc de demo'
    + ' ne tourne pas, le fichier sort en code 0 sans rien afficher.'
    + '\n  Forme correcte: pathToFileURL(process.argv[1]).href');
});

test('les exemples qui ont une garde utilisent la forme canonique', () => {
  /* Cas oppose: sans cette assertion, SUPPRIMER la garde ferait passer le test precedent. */
  const avecGarde = fichiers.filter((f) => fs.readFileSync(path.join(DOSSIER, f), 'utf8').includes('import.meta.url'));
  assert.ok(avecGarde.length >= 3,
    'temoin: ' + avecGarde.length + ' exemple(s) portent une garde — s il n y en a plus,'
    + ' l assertion precedente ne prouve plus rien');
  /* On exige l APPEL, pas l import: un `import { pathToFileURL }` laisse inutilisé suffirait a
   * satisfaire une recherche du seul nom, et c est exactement ce qu une mutation a montre. */
  const sansCanonique = avecGarde.filter((f) => !fs.readFileSync(path.join(DOSSIER, f), 'utf8').includes('pathToFileURL(process.argv'));
  assert.deepEqual(sansCanonique, [],
    'exemple(s) comparant import.meta.url sans APPELER pathToFileURL(process.argv[1]): '
    + JSON.stringify(sansCanonique));
});
