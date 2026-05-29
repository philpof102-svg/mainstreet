// Mainstreet — verify a Mainstreet attestation payload structure
// Useful for consumers (RWA underwriters, orchestrator agents) that
// want to validate they're consuming a real Mainstreet attestation
// before trusting its score.
// Run: node examples/verify-payload.js

const { buildAttestationPayload, SUBJECT_TYPES, ORACLE_VERSION, BASE_MAINNET_CHAIN_ID } = require('../oracle');

const REQUIRED_FIELDS = ['version', 'chainId', 'subjectType', 'subject', 'score', 'timestamp'];
const VALID_SUBJECT_TYPES = Object.values(SUBJECT_TYPES);

function verify(payload) {
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

const agentErrors = verify(agentPayload);
const bizErrors = verify(businessPayload);

console.log('=== Agent payload ===');
console.log(`score ${agentPayload.score}/100, verify:`, agentErrors.length === 0 ? 'OK' : agentErrors);

console.log('\n=== Business payload ===');
console.log(`score ${businessPayload.score}/100, verify:`, bizErrors.length === 0 ? 'OK' : bizErrors);

console.log('\n=== Tampered payload (negative test) ===');
const tampered = { ...agentPayload, score: 150, version: 'fake-v0' };
console.log('verify tampered:', verify(tampered));

module.exports = { verify };
