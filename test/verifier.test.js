'use strict';
/**
 * Le verificateur publie est une PORTE DE PAIEMENT: il doit refuser plus souvent qu'il n'accepte.
 *
 * `sdk/verifier.js` est exporte sous `mainstreet-oracle/verifier` et part dans le tarball npm. Avant
 * ce fichier, RIEN ne le chargeait — ni un test, ni `sdk/index.js`. Mesure du 2026-08-15, avec un
 * serveur local et un viem bouchonne qui NOTE ce qu'on lui donne:
 *
 *  1. LE DOMAINE EIP-712 VENAIT DE L'OBJET VERIFIE. `attestation.eip712?.domain || DOMAIN` — une
 *     attestation portant `{name:'UN-AUTRE-PROTOCOLE', version:'9', chainId:1}` faisait passer CE
 *     domaine-la a la recuperation de signature, et `verifyAttestation` rendait `true`. Les
 *     constantes epinglees existent dans le meme fichier et ne servaient que de REPLI. Separer les
 *     domaines est precisement ce qui empeche une signature faite ailleurs de valoir ici.
 *
 *  2. LES BORNES S'OUVRAIENT SUR UNE VALEUR NON NUMERIQUE. Mesure, avec `minScore = 50`:
 *       payload {}                       -> A RENDU undefined
 *       payload sans timestamp ni score  -> A RENDU undefined
 *       score 99 sans horodatage         -> A RENDU 99
 *       horodatage "abc"                 -> A RENDU 99
 *       horodatage vieux de 10 jours     -> leve (la borne marche quand elle a un nombre)
 *       score null                       -> leve (`null < 50` est VRAI)
 *     `Number(undefined)` et `Number('abc')` valent NaN, et `NaN > 86400` est FAUX: la garde de
 *     fraicheur echoue OUVERTE. Et `undefined < 50` est FAUX la ou `null < 50` est VRAI — les deux
 *     valeurs « absentes » se comportent a l'OPPOSE dans la meme comparaison.
 *
 *  3. LE REFUS DU SERVEUR N'ETAIT PAS LU. En prod, `/api/agent/attestation/<addr>` repond HTTP 200
 *     avec `signed:false`, un `reason` (`score-built-on-incomplete-read`) et un `retry`: le refus est
 *     dans le CORPS, pas dans le statut. `fetchAttestation` ne teste que `r.ok` et rendait ce corps.
 *     ⚠️ Sur cette forme-la, `requireMinScore` LEVAIT deja — mais un TypeError sur `payload`
 *     indefini, pas un refus lisible. Le fail-open du point 2 n'apparait que si `payload` EXISTE.
 *
 * ⚖️ BORNES. Zero reseau: serveur sur 127.0.0.1 et viem bouchonne. Un bouchon qui rend toujours
 * l'operateur NE PROUVE PAS qu'une vraie signature recupererait cette adresse — il prouve ce que le
 * module TRANSMET a la recuperation, ce qui est exactement le defaut vise. Ce fichier ne dit rien de
 * la verification ON-CHAIN (`buildOnchainCall`), qui n'est pas exercee ici.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const RACINE = path.join(__dirname, '..');
const A = '0x' + '11'.repeat(20);
const SUJET = '0x' + '00'.repeat(32);

let srv;
let V;
let corps = null;
const vus = [];
const viemStub = { recoverTypedDataAddress: async (a) => { vus.push(a); return V.OPERATOR; } };

test.before(async () => {
  srv = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(corps));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  /* Le module lit MAINSTREET_ORIGIN au chargement: il faut le poser AVANT le require. */
  process.env.MAINSTREET_ORIGIN = 'http://127.0.0.1:' + srv.address().port;
  V = require(path.join(RACINE, 'sdk', 'verifier.js'));
});

test.after(() => { if (srv) srv.close(); });

const attestationValide = (extra) => Object.assign({
  address: A, signed: true,
  payload: { version: '1', subjectType: 'agent', subject: SUJET, score: 80,
    timestamp: Math.floor(Date.now() / 1000), operator: V.OPERATOR, nonce: 1 },
  signature: '0x' + '11'.repeat(65),
}, extra);

test('TEMOIN: une attestation complete et signee passe encore', async () => {
  corps = attestationValide();
  const s = await V.requireMinScore(A, 50, viemStub);
  assert.equal(s, 80, 'sans ce temoin, une porte qui refuse TOUT passerait tous les autres tests');
});

test('le domaine EIP-712 est EPINGLE, jamais pris dans l objet verifie', async () => {
  vus.length = 0;
  const etranger = { name: 'UN-AUTRE-PROTOCOLE', version: '9', chainId: 1 };
  const att = attestationValide({ eip712: { domain: etranger, types: { Attestation: [{ name: 'x', type: 'string' }] } } });

  await assert.rejects(() => V.verifyAttestation(att, viemStub), /domain|domaine|EIP-712/i,
    'une attestation qui apporte SON PROPRE domaine doit etre refusee, pas verifiee sous ce domaine');

  /* Et si malgre tout la recuperation a ete appelee, elle ne doit pas avoir vu le domaine etranger. */
  for (const a of vus) {
    assert.notDeepEqual(a.domain, etranger,
      'le domaine fourni par l objet verifie a ete transmis a la recuperation de signature');
  }
});

test('le domaine epingle est bien celui utilise quand l attestation n en apporte pas', async () => {
  vus.length = 0;
  await V.verifyAttestation(attestationValide(), viemStub);
  assert.equal(vus.length, 1, 'accessibilite: la recuperation doit avoir ete appelee');
  assert.deepEqual(vus[0].domain, V.DOMAIN, 'le domaine passe doit etre la constante du module');
  assert.deepEqual(vus[0].types, V.TYPES, 'les types passes doivent etre ceux du module');
});

test('une borne non numerique ne peut pas s ouvrir', async () => {
  const cas = [
    ['payload vide', {}],
    ['sans timestamp ni score', { subject: SUJET, nonce: 1 }],
    ['score sans horodatage', { score: 99, subject: SUJET, nonce: 1 }],
    ['horodatage non numerique', { score: 99, timestamp: 'abc', subject: SUJET, nonce: 1 }],
    ['score undefined explicite', { score: undefined, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 }],
  ];
  const ouvertes = [];
  for (const [nom, payload] of cas) {
    corps = attestationValide({ payload });
    try {
      const s = await V.requireMinScore(A, 50, viemStub);
      ouvertes.push(nom + ' -> a rendu ' + JSON.stringify(s));
    } catch { /* refuser est le comportement attendu */ }
  }
  assert.deepEqual(ouvertes, [],
    'porte(s) ouverte(s) sur une valeur non numerique:\n  ' + ouvertes.join('\n  ')
    + '\n  NaN > 86400 est FAUX et undefined < 50 est FAUX: une comparaison ne borne rien'
    + ' tant que la valeur n a pas ete prouvee finie.');
});

test('null et undefined sont traites PAREIL', async () => {
  const resultat = async (score) => {
    corps = attestationValide({ payload: { score, timestamp: Math.floor(Date.now() / 1000), subject: SUJET, nonce: 1 } });
    try { return 'rend ' + JSON.stringify(await V.requireMinScore(A, 50, viemStub)); } catch { return 'leve'; }
  };
  const avecNull = await resultat(null);
  const avecUndef = await resultat(undefined);
  assert.equal(avecNull, avecUndef,
    'les deux valeurs « absentes » divergeaient: `null < 50` est VRAI donc attrape, `undefined < 50`'
    + ' est FAUX donc laisse passer. null: ' + avecNull + ' | undefined: ' + avecUndef);
  assert.equal(avecNull, 'leve', 'et les deux doivent REFUSER');
});

test('le refus du serveur est LU, et sa raison est rendue au consommateur', async () => {
  /* Forme REELLE relevee en prod le 2026-08-15: HTTP 200, refus dans le corps. */
  corps = {
    version: '1', address: A, signed: false, score: 91,
    reason: 'score-built-on-incomplete-read',
    detail: 'latest leaderboard row is marked DEGRADED',
    retry: 'The next clean leaderboard build re-scores this address; re-request then.',
    sources: ['x402-bazaar-base', 'DEGRADED:reputation-unreadable'],
  };
  await assert.rejects(() => V.fetchAttestation(A), /score-built-on-incomplete-read/,
    'le serveur DIT `signed:false` avec une raison lisible — la porte doit refuser en la citant,'
    + ' au lieu de rendre ce corps et de mourir plus loin sur un TypeError.');
  await assert.rejects(() => V.requireMinScore(A, 50, viemStub), /score-built-on-incomplete-read/,
    'et la raison doit survivre jusqu au consommateur, qui est celui qui decide de payer');
});

test('CAS OPPOSE: une attestation perimee est toujours refusee', async () => {
  corps = attestationValide({ payload: { score: 99, timestamp: Math.floor(Date.now() / 1000) - 864000, subject: SUJET, nonce: 1 } });
  await assert.rejects(() => V.requireMinScore(A, 50, viemStub), /stale/,
    'la borne de fraicheur qui marchait deja ne doit pas avoir ete perdue');
});
