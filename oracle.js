/**
 * Mainstreet Oracle — dual-subject reputation oracle on Base.
 *
 * Wall Street meets Main Street, AND Agent meets Agent.
 *
 * Score 0-100 onchain pour DEUX types de sujets :
 *   1. business-google : commerces réels (rating Google + volume avis)
 *   2. agent-onchain   : agents IA sur Virtuals/ACP/Base App
 *                       (success rate + volume USDC + recency)
 *
 * Publie au format ERC-8004 ReputationRegistry (canonical, déjà déployé
 * sur Base à 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63).
 *
 * NE PUBLIE RIEN ON-CHAIN tant que MAINSTREET_ENABLED != '1'.
 * Doc design : docs/MAINSTREET.md
 * Spec ERC-8004 : https://eips.ethereum.org/EIPS/eip-8004
 */

const crypto = require('crypto');

const ORACLE_VERSION = 'mainstreet-v1';
const BASE_MAINNET_CHAIN_ID = 8453;

// ERC-8004 canonical registries on Base mainnet.
// Verified on Basescan, ERC-8004 tagged, source verified.
// Source : github.com/erc-8004/erc-8004-contracts README, 2026-05-29.
const ERC_8004_BASE = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
};

const SUBJECT_TYPES = {
  BUSINESS_GOOGLE: 'business-google',
  AGENT_ONCHAIN: 'agent-onchain',
};

// ─── Scoring : business Google ────────────────────────────────
/**
 * @param {{rating: number|null, reviewCount: number|null}} snapshot
 * @returns {number} score 0-100
 */
function computeScoreBusiness(snapshot) {
  const rating = Number(snapshot?.rating) || 0;
  const reviewCount = Number(snapshot?.reviewCount) || 0;
  const ratingPart = Math.max(0, Math.min(60, (rating / 5) * 60));
  const volumePart = Math.max(0, Math.min(40, Math.log10(Math.max(1, reviewCount)) * 10));
  return Math.round(ratingPart + volumePart);
}

// ─── Scoring : agent IA onchain ────────────────────────────────
/**
 * Score un agent IA en fonction de :
 *  - successRate (0-1) : % de jobs livrés sans dispute → 50 pts
 *  - usdcVolume (USD)  : volume cumulé processed (log scale) → 30 pts
 *  - daysSinceLastJob  : récence (decay exponentiel) → 20 pts
 *
 * @param {{
 *   successRate: number|null,
 *   usdcVolume: number|null,
 *   daysSinceLastJob: number|null,
 *   jobCount?: number|null,
 * }} metrics
 * @returns {number} score 0-100
 */
function computeScoreAgent(metrics) {
  // ?? 0 not || 0 — daysSinceLastJob can legitimately be 0 (active today)
  const successRate = Math.max(0, Math.min(1, Number(metrics?.successRate ?? 0)));
  const usdcVolume = Math.max(0, Number(metrics?.usdcVolume ?? 0));
  const daysSinceLastJob = Math.max(0, Number(metrics?.daysSinceLastJob ?? 365));
  const jobCount = Math.max(0, Number(metrics?.jobCount ?? 0));

  // Success rate : 50 pts, pénalisé si très peu de jobs (< 10) pour
  // éviter qu'un agent avec 1 succès = score parfait.
  const sampleConfidence = Math.min(1, jobCount / 10);
  const successPart = successRate * 50 * sampleConfidence;

  // Volume : log10($) capé à 5 (= $100k cumul) → 30 pts max
  const volumePart = Math.min(30, Math.log10(Math.max(1, usdcVolume)) * 6);

  // Récence : decay sur 30 jours, 20 pts si < 1 jour, 0 si > 30
  const recencyPart = Math.max(0, 20 * Math.exp(-daysSinceLastJob / 15));

  return Math.round(successPart + volumePart + recencyPart);
}

// ─── Scoring : activity (public leaderboard) ───────────────────
/**
 * Composite "activity rank" used when full reputation metrics are not
 * available (Bazaar exposes resource_count but no successRate/volume).
 *
 * Goal: produce a usable ranking across all indexed agents while keeping
 * the strict reputation score reserved for agents with real evidence.
 *
 * Components:
 *  - activity: log10(jobCount) capped → up to 50 pts
 *  - recency: exp decay → up to 20 pts
 *  - reputation bump: successRate * sampleConfidence → up to 30 pts
 *
 * Total 0-100. Designed so a Bazaar-only agent with 1000 services can
 * reach ~55 while an ERC-8004-attested agent with proven 99% success can
 * reach the high 80s.
 */
function computeActivityScore(metrics) {
  const jobCount = Math.max(0, Number(metrics?.jobCount ?? 0));
  const daysSinceLastJob = Math.max(0, Number(metrics?.daysSinceLastJob ?? 30));
  const successRate = metrics?.successRate == null ? null : Math.max(0, Math.min(1, Number(metrics.successRate)));
  const alive = metrics?.alive;
  // Longevity signals — agent has been around for a while + showed up consistently
  const ageDays = Math.max(0, Number(metrics?.ageDays ?? 0));
  const snapshotDays = Math.max(0, Number(metrics?.snapshotDaysLast30 ?? 0));
  // Diversity — number of distinct tags / categories surfaced in Bazaar metadata
  const tagCount = Math.max(0, Number(metrics?.tagCount ?? 0));

  // Activity (40 pts max — was 45, lowered to leave room for longevity/diversity)
  const activityPart = Math.min(40, Math.log10(Math.max(1, jobCount)) * 10);

  // Recency (15 pts max — was 20)
  const recencyPart = Math.max(0, 15 * Math.exp(-daysSinceLastJob / 15));

  // Reputation (30 pts max — unchanged)
  let reputationPart = 0;
  if (successRate != null) {
    const sampleConfidence = Math.min(1, jobCount / 10);
    reputationPart = successRate * 30 * sampleConfidence;
  }

  // Health (-3 to +5)
  let healthPart = 0;
  if (alive === true) healthPart = 5;
  else if (alive === false) healthPart = -3;

  // Longevity & diversity (10 pts max):
  //   - age:        +3 if ageDays >= 30, +2 if >= 14, +1 if >= 7
  //   - consistency: +3 if snapshotDays >= 21, +2 if >= 10, +1 if >= 5
  //   - diversity:  +4 if tagCount >= 5, +2 if >= 2, 0 otherwise
  let agePart = 0;
  if (ageDays >= 30) agePart = 3;
  else if (ageDays >= 14) agePart = 2;
  else if (ageDays >= 7) agePart = 1;

  let consistencyPart = 0;
  if (snapshotDays >= 21) consistencyPart = 3;
  else if (snapshotDays >= 10) consistencyPart = 2;
  else if (snapshotDays >= 5) consistencyPart = 1;

  let diversityPart = 0;
  if (tagCount >= 5) diversityPart = 4;
  else if (tagCount >= 2) diversityPart = 2;

  const longevityPart = agePart + consistencyPart + diversityPart;

  return Math.max(0, Math.min(100, Math.round(
    activityPart + recencyPart + reputationPart + healthPart + longevityPart
  )));
}

// ─── Dispatcher ────────────────────────────────────────────────
function computeScore(subject) {
  if (subject?.subjectType === SUBJECT_TYPES.AGENT_ONCHAIN) {
    return computeScoreAgent(subject);
  }
  return computeScoreBusiness(subject);
}

/**
 * Hash du subject pour stocker on-chain sans révéler la valeur brute.
 * Accepts placeId (business) ou agentId/address (agent).
 * keccak256 émulé via SHA-256 ici — à remplacer par vraie keccak256
 * quand on branchera viem/ethers (le contrat ERC-8004 attend keccak256).
 */
function hashSubject(identifier) {
  return '0x' + crypto.createHash('sha256').update(String(identifier)).digest('hex');
}

function identifierOf(snapshot) {
  if (snapshot?.subjectType === SUBJECT_TYPES.AGENT_ONCHAIN) {
    return snapshot.agentId || snapshot.agentAddress;
  }
  return snapshot.placeId;
}

/**
 * Construit le payload non-signé. Signataire = wallet operator dédié,
 * JAMAIS le wallet perso du fondateur.
 *
 * @param {object} snapshot
 *   business-google: { subjectType?, placeId, rating, reviewCount, fetchedAt? }
 *   agent-onchain  : { subjectType, agentId|agentAddress, successRate, usdcVolume, daysSinceLastJob, jobCount, fetchedAt? }
 * @param {{operatorAddress?: string, nonce?: number}} ctx
 * @returns {object} payload
 */
function buildAttestationPayload(snapshot, ctx = {}) {
  const subjectType = snapshot?.subjectType || SUBJECT_TYPES.BUSINESS_GOOGLE;
  const score = computeScore({ ...snapshot, subjectType });
  const identifier = identifierOf({ ...snapshot, subjectType });
  const subjectHash = hashSubject(identifier);
  const timestamp = Math.floor(new Date(snapshot.fetchedAt || Date.now()).getTime() / 1000);

  const payload = {
    version: ORACLE_VERSION,
    chainId: BASE_MAINNET_CHAIN_ID,
    subjectType,
    subject: subjectHash,
    score,
    timestamp,
    operator: ctx.operatorAddress || null,
    nonce: ctx.nonce ?? null,
  };

  // Champs spécifiques au subjectType (off-chain, on les attache pour
  // que le feedbackURI off-chain les serve à la lecture).
  if (subjectType === SUBJECT_TYPES.AGENT_ONCHAIN) {
    payload.agentMetrics = {
      successRate: snapshot.successRate ?? null,
      usdcVolume: snapshot.usdcVolume ?? null,
      daysSinceLastJob: snapshot.daysSinceLastJob ?? null,
      jobCount: snapshot.jobCount ?? null,
    };
  } else {
    payload.businessMetrics = {
      rating: snapshot.rating ?? null,
      reviewCount: snapshot.reviewCount ?? null,
    };
  }

  return payload;
}

/**
 * Signe le payload avec OPERATOR_PRIVATE_KEY.
 * Stub — vraie signature EIP-712 à brancher avec viem (`signTypedData`).
 */
async function signPayload(payload) {
  if (process.env.MAINSTREET_ENABLED !== '1') return null;
  if (!process.env.OPERATOR_PRIVATE_KEY) {
    console.warn('[mainstreet] OPERATOR_PRIVATE_KEY manquant — signature impossible');
    return null;
  }
  // TODO : signTypedData(viem) sur le domaine EIP-712 du registry.
  throw new Error('[mainstreet] signature pas encore implémentée (voir docs/MAINSTREET.md)');
}

/**
 * Pipeline complet : snapshot → score → payload → signature.
 *
 * @param {object} snapshot voir buildAttestationPayload
 * @returns {Promise<{payload: object, signature: string|null, ready: boolean, error?: string}>}
 */
async function attest(snapshot) {
  const payload = buildAttestationPayload(snapshot, {
    operatorAddress: process.env.OPERATOR_ADDRESS || null,
  });
  let signature = null;
  try {
    signature = await signPayload(payload);
  } catch (err) {
    return { payload, signature: null, ready: false, error: err.message };
  }
  return { payload, signature, ready: !!signature };
}

module.exports = {
  computeScore,
  computeScoreBusiness,
  computeScoreAgent,
  computeActivityScore,
  hashSubject,
  buildAttestationPayload,
  attest,
  ORACLE_VERSION,
  BASE_MAINNET_CHAIN_ID,
  ERC_8004_BASE,
  SUBJECT_TYPES,
};
