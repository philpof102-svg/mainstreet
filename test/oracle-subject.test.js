'use strict';
/**
 * Le score échoue FERMÉ, l'identité échouait OUVERT — dans le même payload.
 *
 * `oracle.js` est le `main` du paquet. `test/oracle.test.js` importe 9 de ses 11 exports; les deux
 * qui manquaient sont `attest` et `computeScore`. Mesure du 2026-08-15.
 *
 * ⚖️ CE QUI ALLAIT DEJA BIEN, et qui compte autant que la prise: `attest()` rend
 * `ready: !!signature`. Une signature nulle ne peut donc PAS produire `ready: true`, et les trois
 * chemins — MainStreet desactive, cle operateur absente, signature pas implementee — tombent tous en
 * `ready: false`. La valeur neutre ne devient jamais une affirmation.
 *
 * ⛔ LE DISPATCHER, LUI, N'AVAIT QUE DEUX BRANCHES POUR TROIS CAS. `computeScore` testait
 * `subjectType === AGENT_ONCHAIN` et renvoyait TOUT LE RESTE a la formule « business ». Mesure, sur
 * un agent quasi parfait qui vaut 96:
 *     type exact       -> 96      type avec une faute -> 0
 *     type absent      -> 0       type inconnu        -> 0
 * Le SCORE echouait donc FERME, ce qui est le bon sens — mais l'IDENTITE echouait OUVERT.
 *
 * 🔴 `identifierOf` suit la MEME branche: hors `agent-onchain` il rend `snapshot.placeId`, soit
 * `undefined` pour un agent. Et `hashSubject` faisait `String(identifier)`, donc:
 *     hashSubject(undefined) === sha256("undefined")     -> verifie, true
 * Le mot « undefined » etait hache comme s'il etait un identifiant, et rendait un hash de 32 octets
 * parfaitement bien forme — indiscernable d'un vrai. `null`, `''`, `0`, `false`, `NaN`, `{}` et `[]`
 * en donnaient un aussi, et `''` et `[]` donnaient LE MEME. Consequence mesuree: deux agents
 * DIFFERENTS, tous deux avec un subjectType non reconnu, produisaient le MEME `payload.subject` —
 * le champ dont le role documente est d'identifier le sujet on-chain sans reveler sa valeur.
 *
 * ⚖️ BORNES. Aucun reseau, aucune signature: `signPayload` leve « pas encore implementee », donc
 * aucun de ces payloads n'a jamais ete signe. Ce fichier ne dit rien de la collision de sha256
 * elle-meme — il parle des entrees qui n'auraient jamais du y entrer.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const O = require(path.join(__dirname, '..', 'oracle.js'));

const AGENT = {
  subjectType: O.SUBJECT_TYPES.AGENT_ONCHAIN,
  agentAddress: '0x' + '11'.repeat(20),
  successRate: 0.98, usdcVolume: 50000, daysSinceLastJob: 1, jobCount: 4000,
};
const COMMERCE = { placeId: 'ChIJ-exemple-de-place-id', rating: 4.4, reviewCount: 950 };

test('TEMOIN: les deux types CONNUS marchent encore', () => {
  const pa = O.buildAttestationPayload(AGENT, {});
  assert.equal(typeof pa.score, 'number');
  assert.ok(pa.score > 50, 'un agent quasi parfait doit scorer haut, vu ' + pa.score);
  const pb = O.buildAttestationPayload(COMMERCE, {});
  assert.equal(typeof pb.score, 'number');
  assert.notEqual(pa.subject, pb.subject, 'deux sujets distincts, deux hashs distincts');
});

test('hashSubject REFUSE ce qui n est pas un identifiant', () => {
  const acceptes = [];
  for (const v of [undefined, null, '', '   ', NaN, {}, [], false]) {
    try {
      const h = O.hashSubject(v);
      acceptes.push(JSON.stringify(String(v)) + ' -> ' + h.slice(0, 18));
    } catch { /* refuser est le comportement attendu */ }
  }
  assert.deepEqual(acceptes, [],
    'hashSubject a rendu un hash BIEN FORME pour une absence:\n  ' + acceptes.join('\n  ')
    + '\n  `String(undefined)` vaut "undefined": le mot etait hache comme un identifiant, et le'
    + ' resultat est indiscernable d un vrai sujet.');
});

test('hashSubject accepte un identifiant reel, et deux valeurs distinctes ne collisionnent pas', () => {
  /* Cas oppose: sans lui, une fonction qui refuse TOUT passerait le test precedent. */
  const h1 = O.hashSubject('ChIJ-un');
  const h2 = O.hashSubject('ChIJ-deux');
  assert.match(h1, /^0x[0-9a-f]{64}$/, 'un identifiant reel doit toujours produire un hash');
  assert.notEqual(h1, h2, 'deux identifiants distincts, deux hashs distincts');
  assert.equal(O.hashSubject(42), '0x' + crypto.createHash('sha256').update('42').digest('hex'),
    'un identifiant numerique reste accepte et garde sa valeur');
});

test('computeScore REFUSE un subjectType qu il ne connait pas', () => {
  const avales = [];
  for (const t of ['agent_onchain', 'agent-onchain ', 'agent-onchain-solana', 'AGENT-ONCHAIN', 'x']) {
    try {
      const s = O.computeScore(Object.assign({}, AGENT, { subjectType: t }));
      avales.push(JSON.stringify(t) + ' -> ' + s);
    } catch { /* refuser est le comportement attendu */ }
  }
  assert.deepEqual(avales, [],
    'subjectType(s) tombes silencieusement sur la branche « business »:\n  ' + avales.join('\n  ')
    + '\n  Un verdict sans sa branche tombe sur le `else` final, et celui-ci rendait 0 pour un agent'
    + ' qui en vaut 96.');
});

test('computeScore garde ses DEUX branches connues', () => {
  /* Cas oppose: un dispatcher qui leve pour tout passerait le test precedent. */
  assert.equal(typeof O.computeScore(AGENT), 'number');
  assert.equal(typeof O.computeScore(Object.assign({ subjectType: O.SUBJECT_TYPES.BUSINESS_GOOGLE }, COMMERCE)), 'number');
  assert.notEqual(O.computeScore(AGENT), 0, 'la branche agent doit encore calculer');
});

test('deux sujets DIFFERENTS ne peuvent pas partager un subject hash', () => {
  const a1 = { subjectType: 'agent_onchain', agentAddress: '0x' + '11'.repeat(20) };
  const a2 = { subjectType: 'agent-onchain-solana', agentAddress: '0x' + '22'.repeat(20) };
  const sujets = [];
  for (const s of [a1, a2]) {
    try { sujets.push(O.buildAttestationPayload(s, {}).subject); } catch { /* refus attendu */ }
  }
  assert.deepEqual(sujets, [],
    'deux agents distincts ont produit un payload; mesure avant correctif, ils partageaient le MEME'
    + ' subject: ' + JSON.stringify(sujets)
    + '\n  Un identifiant absent doit faire echouer la construction, pas produire un hash commun.');
});

test('attest() ne peut pas se declarer pret sans signature', () => {
  /* Ce qui allait deja bien, epingle pour que ca le reste. */
  return O.attest(AGENT).then((r) => {
    assert.equal(r.signature, null, 'aucune signature n est produite aujourd hui');
    assert.equal(r.ready, false, '`ready` doit suivre la signature, jamais le payload');
    assert.ok(r.payload && typeof r.payload.score === 'number', 'le payload reste rendu, non signe');
  });
});
