/**
 * health-aware-buyer.js
 *
 * Demo: a buyer agent that only pays an agent whose endpoint is
 * verified ALIVE by the Mainstreet health probe.
 *
 * Run: node examples/health-aware-buyer.js [agentAddress]
 *
 * The endpoint accepts a `?live=1` query to force a fresh score (paid),
 * otherwise returns the daily cached snapshot (free).
 */

const ORIGIN = 'https://avisradar-production.up.railway.app';
const DEFAULT_AGENT = '0x2bb72231eed303cc91a462a1fa738b42b6a9ac6d'; // Polymarket-style
const MIN_SCORE = 30;

async function fetchScore(addr) {
  const r = await fetch(`${ORIGIN}/api/agent/score/${addr}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const addr = (process.argv[2] || DEFAULT_AGENT).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    console.error('usage: node examples/health-aware-buyer.js <0x...>');
    process.exit(1);
  }

  console.log(`▸ Vetting agent ${addr.slice(0, 10)}...${addr.slice(-6)} via Mainstreet`);
  const data = await fetchScore(addr);
  const { score, health, resourcePath, description, price } = data;

  console.log(`  score:        ${score ?? '—'}/100`);
  console.log(`  description:  ${(description || '—').slice(0, 80)}`);
  console.log(`  health.alive: ${health?.alive}`);
  console.log(`  serviceUrl:   ${resourcePath || '—'}`);
  console.log(`  price:        ${price ? (Number(price.amount) / 1e6) + ' USDC' : '—'}`);

  // Gate 1: score threshold
  if (score == null || score < MIN_SCORE) {
    console.log(`\n✗ Reject: score below threshold (${MIN_SCORE})`);
    process.exit(0);
  }
  // Gate 2: endpoint must be alive (skip if unprobed — defaults to unknown)
  if (health && health.alive === false) {
    console.log('\n✗ Reject: endpoint unreachable (last probe failed)');
    process.exit(0);
  }
  // Gate 3: resource path must exist
  if (!resourcePath) {
    console.log('\n✗ Reject: no service URL published');
    process.exit(0);
  }

  console.log('\n✓ All gates passed — safe to pay. Service URL:');
  console.log(`  ${resourcePath}`);
  console.log('\nIn a real buyer agent, you would now POST to that URL with an x402 signed payment header.');
}

main().catch((e) => {
  console.error('failed:', e.message);
  process.exit(1);
});
