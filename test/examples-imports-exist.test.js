'use strict';
/**
 * LES EXEMPLES PUBLIES IMPORTENT-ILS DES EXPORTS QUI EXISTENT ? — le complement de examples.test.js.
 *
 * `test/examples.test.js` verifie qu'un exemple PARSE sous sa propre extension, et son en-tete le dit:
 * « verifie qu'un exemple DEMARRE, pas qu'il fait ce qu'il annonce ». Mesure du 2026-08-15: `node
 * --check` ne resout PAS les imports nommes — un `import { exportInexistant } from 'mainstreet-oracle/
 * tools'` passe `--check` avec rc=0, puis JETTE a l'execution chez l'utilisateur (« does not provide an
 * export named ... »). Donc la porte « doit DEMARRER » ne couvre pas le cas ou l'exemple ne demarre pas.
 *
 * Ces exemples partent dans le tarball (package.json#files: 'examples/'): ce sont les premiers pas
 * copies-colles d'un utilisateur. Un export de `sdk/tools.js` renomme demain casse l'exemple, et TOUTE
 * la suite reste verte — la meme classe que le .d.ts qui promettait un symbole absent (test/types-match-
 * runtime). Aujourd'hui tout resout; ce gate empeche la derive.
 *
 * ⚖️ BORNES. On ne verifie que les imports depuis NOS sous-chemins (`mainstreet-oracle`, `.../tools`,
 * `.../sdk`, `.../oracle`, `.../verifier`) — les imports tiers (`@anthropic-ai/sdk`, `langchain`...) ne
 * sont pas les notres et leur presence depend de l'install de l'utilisateur. On resout via la MEME carte
 * `exports` que npm publie, donc on teste le chemin reel du paquet, pas un raccourci. Les imports DEFAUT
 * (`import X from`) ne sont pas des noms a verifier ici; seuls les imports NOMMES le sont. On lit les
 * NOMS exportes, jamais les signatures.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'examples');
const PKG = require('../package.json');
const NOM = PKG.name;   // 'mainstreet-oracle'

/* La carte exports du paquet, resolue vers le fichier require() reel. Un sous-chemin peut etre une
 * chaine ('./oracle.js') ou un objet conditionnel ({require, import, types}). On prend `require` car le
 * test tourne en CJS. */
function fichierPour(cle) {
  const cible = PKG.exports[cle];
  if (!cible) return null;
  const rel = typeof cible === 'string' ? cible : (cible.require || cible.default || cible.import);
  return rel ? path.join(RACINE, rel) : null;
}

/* Les noms qu'un module exporte VRAIMENT, lus au runtime. Le .mjs re-exporte le .js (voir sdk/tools.mjs),
 * donc require() du .js donne la meme surface de noms — et c'est celle que l'utilisateur obtient. */
function exportsReels(specifier) {
  // 'mainstreet-oracle' -> cle '.'; 'mainstreet-oracle/tools' -> cle './tools'
  const sousChemin = specifier === NOM ? '.' : '.' + specifier.slice(NOM.length);
  const fichier = fichierPour(sousChemin);
  if (!fichier) return null;
  return new Set(Object.keys(require(fichier)));
}

/* Extrait les imports NOMMES depuis nos sous-chemins. Rend [{specifier, noms:[...]}]. Le nom retenu est
 * celui EXPORTE (avant `as`), car c'est lui qui doit exister dans le module. */
function importsNotres(src) {
  const out = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const specifier = m[2];
    if (specifier !== NOM && !specifier.startsWith(NOM + '/')) continue;   // uniquement les notres
    const noms = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    if (noms.length) out.push({ specifier, noms });
  }
  return out;
}

const fichiers = fs.readdirSync(DOSSIER).filter((f) => f.endsWith('.js') || f.endsWith('.mjs')).sort();

test('VALIDATION DE L INSTRUMENT — parse des imports, et resolution des exports, savent dire oui ET non', () => {
  const synth = "import Anthropic from '@anthropic-ai/sdk';\n"
    + "import { anthropic as t, execute } from 'mainstreet-oracle/tools';\n"
    + "import { attest } from 'mainstreet-oracle';\n";
  const found = importsNotres(synth);
  // le tiers est ignore, les deux notres sont captures avec le nom EXPORTE (anthropic, pas t)
  assert.deepEqual(found.map((x) => x.specifier).sort(), ['mainstreet-oracle', 'mainstreet-oracle/tools']);
  const tools = found.find((x) => x.specifier.endsWith('/tools'));
  assert.deepEqual(tools.noms.sort(), ['anthropic', 'execute'], 'le nom retenu est l EXPORTE, pas l alias');

  const exp = exportsReels('mainstreet-oracle/tools');
  assert.ok(exp && exp.has('anthropic'), 'temoin positif: tools exporte bien anthropic');
  assert.ok(!exp.has('exportQuiNexistePas'), 'temoin negatif: sinon ce test dit toujours oui');
});

test('chaque import depuis mainstreet-oracle, dans chaque exemple publie, nomme un export REEL', () => {
  const manquants = [];
  for (const f of fichiers) {
    const src = fs.readFileSync(path.join(DOSSIER, f), 'utf8');
    for (const { specifier, noms } of importsNotres(src)) {
      const exp = exportsReels(specifier);
      if (!exp) { manquants.push(f + ': sous-chemin non resolu par package.json#exports -> ' + specifier); continue; }
      for (const nom of noms) {
        if (!exp.has(nom)) manquants.push(f + ': import { ' + nom + " } from '" + specifier + "' — ce nom n est pas exporte");
      }
    }
  }
  assert.deepEqual(manquants, [],
    'import(s) publie(s) vers un export inexistant — l exemple JETTE a l execution, `node --check` ne l attrape pas:\n  '
    + manquants.join('\n  '));
});

test('TEMOIN — au moins un exemple importe vraiment de mainstreet-oracle (sinon le gate est vide)', () => {
  const avec = fichiers.filter((f) => importsNotres(fs.readFileSync(path.join(DOSSIER, f), 'utf8')).length);
  assert.ok(avec.length >= 3, 'succes vide: ' + avec.length + ' exemple(s) importent de mainstreet-oracle');
});
