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
const scriptTest = require(path.join(RACINE, 'package.json')).scripts.test || '';
const fichiers = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js'));

test('aucun fichier de test n est orphelin', () => {
  /* Un succes VIDE serait le meme defaut d'un cran plus haut: si la lecture du dossier rend zero
   * fichier, la porte passerait en n'ayant rien verifie. */
  assert.ok(fichiers.length >= 2,
    'succes vide: ' + fichiers.length + ' fichier(s) de test lu(s) — la porte ne lit plus rien');

  const orphelins = fichiers.filter((f) => !scriptTest.includes('test/' + f));
  assert.deepStrictEqual(orphelins, [],
    'fichier(s) de test que `npm test` ne lance pas: ' + JSON.stringify(orphelins)
    + '\n  Un test hors du chemin d execution ne garde rien, et il passe silencieusement pour vert.');
});

test('la porte MORD — un orphelin simule est detecte', () => {
  /* Le cas oppose, sur une copie en memoire: sans lui, une porte qui ne trouve jamais rien passerait
   * exactement comme une porte qui fonctionne. */
  const scriptAmpute = scriptTest.replace('test/' + fichiers[0], 'test/inexistant.js');
  assert.notStrictEqual(scriptAmpute, scriptTest, 'la mutation ne s est pas appliquee — rien n est prouve');
  const orphelins = fichiers.filter((f) => !scriptAmpute.includes('test/' + f));
  assert.deepStrictEqual(orphelins, [fichiers[0]], 'la porte doit nommer le fichier retire');
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
