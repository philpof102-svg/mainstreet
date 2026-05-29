// Mainstreet — score a list of agents and produce a leaderboard
// Demo: pretend we have onchain metrics for top agents and rank them.
// Run: node examples/score-leaderboard.js

const { computeScoreAgent, buildAttestationPayload, SUBJECT_TYPES } = require('../oracle');

// Hypothetical metrics. In production these come from x402 facilitator
// discovery, ERC-8004 ReputationRegistry feedback events, and Virtuals
// ACP escrow completion events.
const agents = [
  {
    name: 'Ethy AI',
    address: '0x1111111111111111111111111111111111111111',
    successRate: 0.99,
    jobCount: 4200,
    usdcVolume: 171_000_000,
    daysSinceLastJob: 0,
  },
  {
    name: 'HeyElsa',
    address: '0x2222222222222222222222222222222222222222',
    successRate: 0.96,
    jobCount: 18_900_000,
    usdcVolume: 503_000_000,
    daysSinceLastJob: 1,
  },
  {
    name: 'Axelrod',
    address: '0x3333333333333333333333333333333333333333',
    successRate: 0.93,
    jobCount: 850,
    usdcVolume: 12_000_000,
    daysSinceLastJob: 0,
  },
  {
    name: 'Mid-tier active',
    address: '0x4444444444444444444444444444444444444444',
    successRate: 0.88,
    jobCount: 120,
    usdcVolume: 18_000,
    daysSinceLastJob: 2,
  },
  {
    name: 'Newbie active',
    address: '0x5555555555555555555555555555555555555555',
    successRate: 1.0,
    jobCount: 4,
    usdcVolume: 120,
    daysSinceLastJob: 0,
  },
  {
    name: 'Mid-tier dormant',
    address: '0x6666666666666666666666666666666666666666',
    successRate: 0.91,
    jobCount: 300,
    usdcVolume: 45_000,
    daysSinceLastJob: 45,
  },
];

const scored = agents
  .map((a) => ({ ...a, score: computeScoreAgent(a) }))
  .sort((x, y) => y.score - x.score);

console.log('=== Mainstreet leaderboard ===\n');
console.log('Rank  Score  Agent              Jobs        Volume         Last job');
console.log('----  -----  -----------------  ----------  -------------  --------');
scored.forEach((a, i) => {
  const rank = String(i + 1).padStart(4);
  const score = String(a.score).padStart(5);
  const name = a.name.padEnd(17);
  const jobs = a.jobCount.toLocaleString('en-US').padStart(10);
  const vol = ('$' + a.usdcVolume.toLocaleString('en-US')).padStart(13);
  const last = (a.daysSinceLastJob === 0 ? 'today' : `${a.daysSinceLastJob}d ago`).padStart(8);
  console.log(`${rank}  ${score}  ${name}  ${jobs}  ${vol}  ${last}`);
});

console.log('\n=== Attestation payload (top agent, ready to sign + submit) ===');
const top = scored[0];
const payload = buildAttestationPayload({
  subjectType: SUBJECT_TYPES.AGENT_ONCHAIN,
  agentAddress: top.address,
  successRate: top.successRate,
  jobCount: top.jobCount,
  usdcVolume: top.usdcVolume,
  daysSinceLastJob: top.daysSinceLastJob,
});
console.log(JSON.stringify(payload, null, 2));
