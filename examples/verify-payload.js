// Mainstreet — check the SHAPE of an attestation payload. NOT its authenticity.
//
// ⛔ CE FICHIER NE PROUVE PAS QU'UNE ATTESTATION EST VRAIE, et il le disait pourtant.
//
// Son en-tête promettait de « validate they're consuming a real Mainstreet attestation before
// trusting its score ». MESURÉ PAR EXÉCUTION le 2026-08-20 : un payload FABRIQUÉ de toutes pièces,
// score 100, subject aléatoire, SANS AUCUNE SIGNATURE, obtient `[]` — zéro erreur — et la démo
// imprime « OK ». `verify()` ne regarde que la forme : champs présents, version, chainId, domaine
// du score, format du hash. Rien qui rattache le payload à l'opérateur.
//
// Un exemple est copié, pas lu : celui-ci enseignait exactement la mauvaise pratique à un
// intégrateur qui décide de payer sur la foi d'un score.
//
// LE VRAI CONTRÔLE EXISTE, dans le même paquet : `sdk/verifier.js` → `verifyAttestation(att, viem)`
// recouvre l'adresse du signataire depuis la signature EIP-712, sous un domaine et des types
// ÉPINGLÉS (une attestation qui apporte son propre domaine est refusée, pas vérifiée sous celui
// qu'elle a choisi), puis la compare à l'opérateur. La fin de ce fichier le montre.
//
// Run: node examples/verify-payload.js

const { buildAttestationPayload, SUBJECT_TYPES, ORACLE_VERSION, BASE_MAINNET_CHAIN_ID } = require('../oracle');

const REQUIRED_FIELDS = ['version', 'chainId', 'subjectType', 'subject', 'score', 'timestamp'];
const VALID_SUBJECT_TYPES = Object.values(SUBJECT_TYPES);

/**
 * Contrôle de FORME uniquement — ne dit rien de l'authenticité.
 *
 * Rend la liste des défauts de structure. Une liste vide signifie « ce payload a la bonne forme »,
 * PAS « ce payload vient de MainStreet ». Pour cela : `verifyAttestation` de sdk/verifier.js.
 */
function verifyShape(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('payload is not an object');
    return errors;
  }
  for (const f of REQUIRED_FIELDS) {
    if (!(f in payload)) errors.push(`missing field: ${f}`);
  }
  if (payload.version !== ORACLE_VERSION) errors.push(`bad version: ${payload.version}, expected ${ORACLE_VERSION}`);
  if (payload.chainId !== BASE_MAINNET_CHAIN_ID) errors.push(`bad chainId: ${payload.chainId}, expected ${BASE_MAINNET_CHAIN_ID}`);
  if (!VALID_SUBJECT_TYPES.includes(payload.subjectType)) errors.push(`unknown subjectType: ${payload.subjectType}`);
  if (typeof payload.score !== 'number' || payload.score < 0 || payload.score > 100) {
    errors.push(`score out of range: ${payload.score}`);
  }
  if (!/^0x[a-f0-9]{64}$/.test(String(payload.subject))) errors.push(`subject not a 32-byte hex hash`);
  if (typeof payload.timestamp !== 'number' || payload.timestamp < 1700000000) {
    errors.push(`timestamp not a unix epoch second after 2023`);
  }
  if (payload.subjectType === SUBJECT_TYPES.AGENT_ONCHAIN && !payload.agentMetrics) {
    errors.push('agent-onchain payload missing agentMetrics');
  }
  if (payload.subjectType === SUBJECT_TYPES.BUSINESS_GOOGLE && !payload.businessMetrics) {
    errors.push('business-google payload missing businessMetrics');
  }
  return errors;
}

// Demo: build one of each and verify both
const agentPayload = buildAttestationPayload({
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  agentAddress: '0xabcdef0123456789abcdef0123456789abcdef01',
  successRate: 0.92,
  jobCount: 250,
  usdcVolume: 80000,
  daysSinceLastJob: 1,
});

const businessPayload = buildAttestationPayload({
  placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  rating: 4.4,
  reviewCount: 950,
});

const agentErrors = verifyShape(agentPayload);
const bizErrors = verifyShape(businessPayload);

console.log('=== Agent payload ===');
console.log(`score ${agentPayload.score}/100, verify:`, agentErrors.length === 0 ? 'OK' : agentErrors);

console.log('\n=== Business payload ===');
console.log(`score ${businessPayload.score}/100, verify:`, bizErrors.length === 0 ? 'OK' : bizErrors);

console.log('\n=== Tampered payload (negative test) ===');
const tampered = { ...agentPayload, score: 150, version: 'fake-v0' };
console.log('verify tampered:', verifyShape(tampered));

// ─── LE CAS QUI MANQUAIT, et qui est le seul qui compte pour un acheteur ─────────────────────────
// Le « negative test » ci-dessus ne casse que la FORME (version bidon, score hors domaine). Un
// faussaire compétent ne fait pas ça : il produit un payload PARFAITEMENT bien formé.
console.log('\n=== Forged payload — perfect shape, signed by NOBODY ===');
const forged = {
  version: ORACLE_VERSION,
  chainId: BASE_MAINNET_CHAIN_ID,
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  subject: '0x' + 'ab'.repeat(32),
  score: 100,
  timestamp: Math.floor(Date.now() / 1000),
  agentMetrics: { successRate: 1, jobCount: 9999, usdcVolume: 9e9, daysSinceLastJob: 0 },
};
const forgedErrors = verifyShape(forged);
console.log('verifyShape(forged):', forgedErrors.length === 0 ? 'OK — and that is the point' : forgedErrors);
console.log('  ⛔ score 100, no signature, no operator — and the shape check has nothing to object to.');
console.log('  ⛔ An empty error list means WELL-FORMED, never AUTHENTIC.');

console.log('\n=== What actually proves authenticity ===');
console.log('  const { verifyAttestation } = require("mainstreet-oracle/sdk/verifier");');
console.log('  const viem = require("viem");');
console.log('  const ok = await verifyAttestation({ payload, signature }, viem);  // true only if the');
console.log('  // EIP-712 signature recovers to the MainStreet operator, under a PINNED domain.');
console.log('  // An attestation that brings its own domain is refused, not verified under it.');
try {
  const { verifyAttestation } = require('../sdk/verifier');
  // Sans signature, le vrai vérificateur REFUSE — il ne rend pas false en silence, il le dit.
  verifyAttestation({ payload: forged }, { recoverTypedDataAddress: async () => '0x0' })
    .then(() => console.log('  (unexpected: it returned instead of throwing)'))
    .catch((e) => console.log('  verifyAttestation(forged): REFUSED —', e.message));
} catch (e) {
  console.log('  (verifier not loadable here:', e.message, ')');
}

module.exports = { verifyShape, verify: verifyShape };
