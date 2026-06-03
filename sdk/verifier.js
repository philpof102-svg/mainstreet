/**
 * MainStreet verifier helpers — off-chain + on-chain.
 *
 * Off-chain (Node/browser): import { verifyAttestation } from '@raskhaaa/mainstreet-oracle/verifier'
 * On-chain: contract at 0x7397adb9713934c36d22aa54b4dbbcd70263592b on Base mainnet.
 */

const VERIFIER_ADDRESS = '0x7397adb9713934c36d22aa54b4dbbcd70263592b';
const OPERATOR = '0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9';
const ORIGIN = process.env.MAINSTREET_ORIGIN || 'https://avisradar-production.up.railway.app';

const DOMAIN = { name: 'MainStreet', version: '1', chainId: 8453 };
const TYPES = {
  Attestation: [
    { name: 'version', type: 'string' },
    { name: 'subjectType', type: 'string' },
    { name: 'subject', type: 'bytes32' },
    { name: 'score', type: 'uint8' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'operator', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
};
const VERIFIER_ABI = [
  { name: 'requireMinScore', type: 'function', stateMutability: 'view', inputs: [
    { name: 'subject', type: 'bytes32' }, { name: 'minScore', type: 'uint8' },
    { name: 'score', type: 'uint8' }, { name: 'timestamp', type: 'uint64' },
    { name: 'nonce', type: 'uint64' }, { name: 'signature', type: 'bytes' },
  ], outputs: [{ type: 'bool' }] },
  { name: 'verifiedScore', type: 'function', stateMutability: 'view', inputs: [
    { name: 'subject', type: 'bytes32' }, { name: 'score', type: 'uint8' },
    { name: 'timestamp', type: 'uint64' }, { name: 'nonce', type: 'uint64' },
    { name: 'signature', type: 'bytes' },
  ], outputs: [{ type: 'uint8' }] },
];

/**
 * Fetch the signed attestation for an address.
 * @returns {{address, score, payload, signature, eip712, verifyHints}}
 */
async function fetchAttestation(address) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('invalid address');
  const r = await fetch(`${ORIGIN}/api/agent/attestation/${address.toLowerCase()}`);
  if (!r.ok) throw new Error(`MainStreet API ${r.status}`);
  return r.json();
}

/**
 * Verify an attestation off-chain via viem.
 * @returns {Promise<boolean>}
 */
async function verifyAttestation(attestation, viem) {
  if (!viem?.recoverTypedDataAddress) throw new Error('pass viem module: { recoverTypedDataAddress }');
  const recovered = await viem.recoverTypedDataAddress({
    domain: attestation.eip712?.domain || DOMAIN,
    types: attestation.eip712?.types || TYPES,
    primaryType: 'Attestation',
    message: attestation.payload,
    signature: attestation.signature,
  });
  return recovered.toLowerCase() === OPERATOR.toLowerCase();
}

/**
 * One-shot trust gate — fetch + verify + check threshold.
 * Throws if score < minScore or attestation is invalid.
 * @returns {Promise<number>} the verified score
 */
async function requireMinScore(address, minScore, viem) {
  const att = await fetchAttestation(address);
  const valid = await verifyAttestation(att, viem);
  if (!valid) throw new Error('MainStreet: attestation signature invalid');
  const ageSec = Math.floor(Date.now() / 1000) - Number(att.payload.timestamp);
  if (ageSec > 86400) throw new Error('MainStreet: attestation stale (>24h)');
  if (att.payload.score < minScore) throw new Error(`MainStreet: score ${att.payload.score} < ${minScore}`);
  return att.payload.score;
}

/**
 * Server-side verification via the /verify endpoint (zero crypto deps).
 * @returns {Promise<{valid: boolean, score: number, hint: string}>}
 */
async function verifyServerSide(attestation, options = {}) {
  const r = await fetch(`${ORIGIN}/api/agent/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: attestation.payload, signature: attestation.signature, minScore: options.minScore }),
  });
  return r.json();
}

/**
 * Build the on-chain transaction calldata to verify an attestation.
 * Use with viem.writeContract() or ethers.Contract.requireMinScore().
 */
function buildOnchainCall(attestation, minScore = 0) {
  return {
    address: VERIFIER_ADDRESS,
    abi: VERIFIER_ABI,
    functionName: 'requireMinScore',
    args: [
      attestation.payload.subject,
      Number(minScore),
      attestation.payload.score,
      BigInt(attestation.payload.timestamp),
      BigInt(attestation.payload.nonce),
      attestation.signature,
    ],
  };
}

module.exports = {
  VERIFIER_ADDRESS,
  OPERATOR,
  DOMAIN,
  TYPES,
  VERIFIER_ABI,
  fetchAttestation,
  verifyAttestation,
  requireMinScore,
  verifyServerSide,
  buildOnchainCall,
};
