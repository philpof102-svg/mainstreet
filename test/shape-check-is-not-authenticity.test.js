// shape-check-is-not-authenticity.test.js
// ================================================================================================
// `examples/verify-payload.js` promettait, dans son en-tête, de « validate they're consuming a real
// Mainstreet attestation before trusting its score ».
//
// MESURÉ PAR EXÉCUTION le 2026-08-20 : un payload FABRIQUÉ de toutes pièces — score 100, subject
// aléatoire, AUCUNE signature, AUCUN opérateur — obtient `[]`, zéro erreur, et la démo imprime
// « OK ». Le contrôle ne regarde que la FORME : champs présents, version, chainId, domaine du
// score, format du hash. Rien qui rattache le payload à qui que ce soit.
//
// Le « negative test » du fichier ne cassait que la forme (version bidon, score 150). Un faussaire
// ne fait pas ça : il produit un payload parfaitement bien formé. Et un exemple est COPIÉ, pas lu —
// celui-ci enseignait la mauvaise pratique à un intégrateur qui décide de payer sur la foi d'un score.
//
// Le vrai contrôle vivait dans le même paquet et n'était appelé nulle part : `verifyAttestation`
// (sdk/verifier.js) recouvre le signataire d'une signature EIP-712 sous un domaine ÉPINGLÉ et le
// compare à l'opérateur.
//
// ⛔ BORNE : ce fichier vérifie le CONTRAT de l'exemple et du vérificateur. Il ne vérifie pas la
// cryptographie de viem, ni qu'une attestation réelle de production est valide.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { verifyShape } = require('../examples/verify-payload.js');
const { verifyAttestation } = require('../sdk/verifier.js');
const { ORACLE_VERSION, BASE_MAINNET_CHAIN_ID, SUBJECT_TYPES } = require('../oracle.js');

const bienForme = () => ({
  version: ORACLE_VERSION,
  chainId: BASE_MAINNET_CHAIN_ID,
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  subject: '0x' + 'ab'.repeat(32),
  score: 100,
  timestamp: Math.floor(Date.now() / 1000),
  agentMetrics: { successRate: 1, jobCount: 9999, usdcVolume: 9e9, daysSinceLastJob: 0 },
});

test('témoin — le contrôle de forme ATTRAPE bien ce qu\'il est censé attraper', () => {
  const p = bienForme();
  assert.deepStrictEqual(verifyShape(p), [], 'un payload bien formé passe (sinon le test suivant ne prouverait rien)');
  assert.ok(verifyShape({ ...p, score: 150 }).length > 0, 'un score hors domaine est refusé');
  assert.ok(verifyShape({ ...p, version: 'fake' }).length > 0, 'une version inconnue est refusée');
  assert.ok(verifyShape({ ...p, subject: 'pas-un-hash' }).length > 0, 'un subject mal formé est refusé');
  assert.ok(verifyShape(null).length > 0, 'et un non-objet aussi');
});

test('LE FAIT : un payload signé par PERSONNE passe le contrôle de forme', () => {
  const forge = bienForme();
  assert.ok(!('signature' in forge) && !('operator' in forge), 'le payload ne porte aucune signature');
  assert.deepStrictEqual(verifyShape(forge), [],
    'zéro erreur — une liste vide veut dire BIEN FORMÉ, jamais AUTHENTIQUE');
});

test('le vrai vérificateur, lui, REFUSE — et il le dit au lieu de rendre false', async () => {
  const faux = { recoverTypedDataAddress: async () => '0x0000000000000000000000000000000000000000' };
  await assert.rejects(() => verifyAttestation({ payload: bienForme() }, faux), /nothing to verify/,
    'sans signature, il refuse explicitement');
  await assert.rejects(() => verifyAttestation(null, faux), /nothing to verify/);
  await assert.rejects(() => verifyAttestation({ payload: bienForme(), signature: '0xdead' }, {}),
    /pass viem module/, 'et sans viem il refuse aussi, plutôt que de faire semblant');
});

test('un signataire QUI N\'EST PAS l\'opérateur ne passe pas', async () => {
  const autre = { recoverTypedDataAddress: async () => '0x1111111111111111111111111111111111111111' };
  const ok = await verifyAttestation({ payload: bienForme(), signature: '0xdead' }, autre);
  assert.strictEqual(ok, false, 'une signature valide d\'un AUTRE que l\'opérateur doit rendre false');
});

test('l\'exemple ne promet plus l\'authenticité, et montre ce qui la prouve', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(path.join(__dirname, '..', 'examples', 'verify-payload.js'), 'utf8');
  // Le blanchiment n'est pas nécessaire ici : la phrase fautive ne doit apparaître NULLE PART,
  // y compris en prose — sauf précédée d'une négation explicite, ce que le test vérifie ensuite.
  assert.ok(!/^\/\/ Useful for consumers .* validate they're consuming a real/m.test(src),
    'l\'ancien en-tête affirmatif a disparu');
  assert.ok(/NOT its authenticity/.test(src), 'le titre dit ce que le fichier ne fait pas');
  assert.ok(/verifyAttestation/.test(src), 'et il nomme le vrai contrôle');
  assert.ok(/signed by NOBODY/.test(src), 'la démo montre le payload forgé qui passe');
  assert.ok(/WELL-FORMED, never AUTHENTIC/.test(src), 'et énonce la distinction en toutes lettres');
  assert.ok(/function verifyShape/.test(src), 'la fonction porte enfin le nom de ce qu\'elle fait');
  assert.ok(/verify: verifyShape/.test(src), 'l\'ancien nom reste exporté — un exemple déjà copié ne doit pas casser');
});
