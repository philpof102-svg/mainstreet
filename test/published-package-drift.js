#!/usr/bin/env node
'use strict';
/**
 * CE QUE LES GENS INSTALLENT EST-IL CE QUE CE DEPOT CONTIENT ?
 * Run: npm run test:published        (reseau — DELIBEREMENT hors de `npm test`)
 *
 * ⚠️ LE TROU QU'IL BOUCHE, ET IL A ETE MESURE AILLEURS LE MEME JOUR. Le 2026-08-16, sur le SaaS
 * voisin: cinq champs de divulgation de fraicheur ECRITS dans le depot et ABSENTS de la reponse
 * servie — la copie en ligne etait plus vieille que le code, et RIEN dans le depot ne pouvait le
 * dire. Il n'y avait aucun instrument qui compare le publie au source.
 *
 * Ce depot a le MEME angle mort, sur une surface plus large: c'est un paquet npm. Sa « production »
 * n'est pas un serveur, c'est le tarball que `npm install` telecharge. Mesure du 2026-08-16:
 * `sdk/verifier.js` a recu un correctif fail-closed (un plancher de score illisible n'exigeait
 * RIEN), la suite est verte, le commit est pousse — et le paquet publie ne le porte pas. Un
 * integrateur qui installe aujourd'hui recoit le code d'AVANT. Aucun test ne le disait.
 *
 * 🔬 COMMENT. On telecharge le tarball PUBLIE, on en extrait les fichiers, et on compare leur
 * CONTENU a celui de l'arbre local — fichier par fichier, sur la liste `files` de package.json.
 * L'attendu n'est jamais ecrit en dur: il est lu dans le depot a chaque execution.
 *
 * ⚖️ CE QU'IL PROUVE, ET CE QU'IL NE PROUVE PAS
 *   · Il prouve qu'un fichier EXPEDIE differe (ou manque) entre le publie et ce depot.
 *   · Il ne dit RIEN de la qualite du changement: un fichier different peut etre une amelioration
 *     non publiee (le cas courant) comme une regression. Il nomme l'ecart, il ne le juge pas.
 *   · Un ecart de VERSION seul n'est pas juge non plus: on compare le CONTENU. Une version bumpee
 *     sans publication et une publication sans bump produisent des diagnostics differents, et les
 *     deux sont dits.
 *
 * ⛔ LECTURE SEULE. Un GET sur le registre, borne. Aucune publication, aucune ecriture, aucun jeton.
 *
 * Codes de sortie, distincts a dessein:
 *   0 = le publie correspond au depot   1 = derive de contenu   2 = sonde muette (rien a conclure)
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const RACINE = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8'));

/**
 * Un lecteur de tar minimal — en-tetes USTAR de 512 octets, assez pour un tarball npm.
 * Ecrit ici plutot qu'installe: ce depot n'ajoute pas une dependance pour lire 60 ko.
 */
function lireTar(buf) {
  const fichiers = new Map();
  let o = 0;
  while (o + 512 <= buf.length) {
    const nom = buf.toString('utf8', o, o + 100).replace(/\0.*$/, '');
    if (!nom) { o += 512; continue; }                       // bloc de fin (deux blocs nuls)
    const tailleOct = buf.toString('utf8', o + 124, o + 136).replace(/\0.*$/, '').trim();
    const taille = parseInt(tailleOct, 8) || 0;
    const type = buf.toString('utf8', o + 156, o + 157);
    o += 512;
    if (type === '0' || type === '\0') fichiers.set(nom, buf.slice(o, o + taille));
    o += Math.ceil(taille / 512) * 512;
  }
  return fichiers;
}

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
/* Comparer le CONTENU, jamais les octets bruts: git (autocrlf) reecrit les fins de ligne a chaque
 * checkout sous Windows, alors que le tarball porte celles du poste qui a publie. Une garde qui
 * alarme sur \r\n se fait retirer — la lecon est deja ecrite dans le detecteur de derive voisin. */
const normaliser = (b) => Buffer.from(b.toString('utf8').split('\r\n').join('\n'), 'utf8');

/** Les fichiers que `files` expedie, developpes en chemins reels. */
function fichiersExpedies() {
  const sortie = [];
  const ajouter = (rel) => {
    const abs = path.join(RACINE, rel);
    let st; try { st = fs.statSync(abs); } catch { return; }
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(abs)) ajouter(path.posix.join(rel, e));
    } else if (st.isFile()) sortie.push(rel.split(path.sep).join('/'));
  };
  for (const f of PKG.files || []) ajouter(f);
  /* npm expedie TOUJOURS package.json, meme absent de `files` — l'oublier ferait passer un
   * changement de `main`, de `exports` ou de `bin` pour « aucune derive ». */
  sortie.push('package.json');
  return [...new Set(sortie)].sort();
}

(async () => {
  console.log('derive du paquet PUBLIE — ce depot contre le registre npm:\n');

  let meta;
  try {
    meta = JSON.parse(execFileSync('npm', ['view', PKG.name, '--json'], { encoding: 'utf8', shell: true, timeout: 60000 }));
  } catch (e) {
    console.log('  registre INJOIGNABLE : ' + String((e && e.message) || e).split('\n')[0]);
    console.log('\n  ⚠️ AUCUNE CONCLUSION. Ne pas lire cette sortie comme « pas de derive ».');
    process.exitCode = 2; return;
  }

  console.log('  version locale   : ' + PKG.version);
  console.log('  version publiee  : ' + meta.version);
  if (PKG.version !== meta.version) {
    console.log('  -> le depot porte une version NON PUBLIEE. La comparaison ci-dessous dit ce que');
    console.log('     recoit aujourd hui quelqu un qui installe, pas ce que ce depot contient.');
  }

  let tgz;
  try {
    const r = await fetch(meta.dist.tarball, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    tgz = Buffer.from(await r.arrayBuffer());
  } catch (e) {
    console.log('\n  tarball INJOIGNABLE : ' + String((e && e.message) || e).split('\n')[0]);
    console.log('  ⚠️ AUCUNE CONCLUSION.');
    process.exitCode = 2; return;
  }

  const dansTar = lireTar(zlib.gunzipSync(tgz));
  /* npm prefixe tout d'un « package/ ». On le retire pour parler les memes chemins que le depot. */
  const publie = new Map();
  for (const [nom, contenu] of dansTar) {
    if (nom.startsWith('package/')) publie.set(nom.slice('package/'.length), contenu);
  }
  if (publie.size === 0) {
    console.log('\n  le tarball n a rendu AUCUN fichier — lecteur tar en defaut, rien a conclure.');
    process.exitCode = 2; return;
  }

  const locaux = fichiersExpedies();
  console.log('  fichiers expedies (depot) : ' + locaux.length + '   ·   dans le tarball publie : ' + publie.size);

  const manquants = [];
  const differents = [];
  const enPlus = [];
  for (const rel of locaux) {
    const pub = publie.get(rel);
    if (!pub) { manquants.push(rel); continue; }
    const ici = normaliser(fs.readFileSync(path.join(RACINE, rel)));
    const la = normaliser(pub);
    if (!ici.equals(la)) differents.push(rel + '  (depot ' + sha(ici) + ' / publie ' + sha(la) + ')');
  }
  for (const rel of publie.keys()) if (!locaux.includes(rel)) enPlus.push(rel);

  console.log('');
  if (enPlus.length) {
    console.log('  ⚠️ publie mais plus expedie par ce depot : ' + enPlus.join(', '));
    console.log('     -> le paquet en ligne porte des fichiers qu un `npm publish` d aujourd hui ne mettrait plus.');
  }
  if (manquants.length) {
    console.log('  🔴 expedies ici et ABSENTS du paquet publie : ' + manquants.join(', '));
  }
  if (differents.length) {
    console.log('  🔴 DERIVE DE CONTENU — ces fichiers different de ce qui est installe aujourd hui :');
    for (const d of differents) console.log('     · ' + d);
  }
  if (manquants.length || differents.length) {
    console.log('\n  -> tout correctif dans ces fichiers N EST PAS chez les installateurs.');
    console.log('     Publier: npm publish  (la version doit etre superieure a ' + meta.version + ').');
    console.log('\n  ⛔ Borne: cet ecart n est pas JUGE. Un fichier different est le plus souvent une');
    console.log('     amelioration non publiee — ce gate nomme l ecart, il ne dit pas qu il est mauvais.');
    process.exitCode = 1; return;
  }
  console.log('  aucune derive de CONTENU: le paquet publie porte les memes fichiers que ce depot.');
  process.exitCode = enPlus.length ? 1 : 0;
})();
