// Mainstreet — x402 buyer example.
// Demonstrates how an agent fetches a Mainstreet reputation score
// by paying $0.05 USDC on Base via x402.
//
// This is exactly what a Butler/ChainLens/buyer agent would run.
//
// Usage:
//   npm i x402-axios viem dotenv
//   BUYER_PRIVATE_KEY=0x... ENDPOINT=https://avisradar.app/api/agent/score/0xSomeAgent node examples/x402-buyer.js

require('dotenv').config();
const { withPaymentInterceptor } = require('x402-axios');
const { privateKeyToAccount } = require('viem/accounts');
const axios = require('axios');

const PK = process.env.BUYER_PRIVATE_KEY;
const ENDPOINT = process.env.ENDPOINT
  || 'https://avisradar.app/api/agent/score/0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9';

if (!PK) {
  console.error('Set BUYER_PRIVATE_KEY env var to a wallet with USDC on Base.');
  console.error('Example: $0.05 per call. Recommended balance: $0.50+.');
  process.exit(1);
}

(async () => {
  const account = privateKeyToAccount(PK);
  const client = withPaymentInterceptor(axios.create({ timeout: 30000 }), account);

  console.log('buyer    :', account.address);
  console.log('endpoint :', ENDPOINT);
  console.log('paying...');

  try {
    const res = await client.get(ENDPOINT);
    console.log('status   :', res.status);
    console.log('payment  :', res.headers['x-payment-response'] ? 'settled' : '(no payment header — endpoint may have been free)');
    console.log('score    :', res.data.score, '/100');
    console.log('sources  :', res.data.sources);
    console.log('metrics  :', JSON.stringify(res.data.metrics));
    console.log('cached   :', res.data.cached);
  } catch (e) {
    console.error('error:', e.response?.status, e.response?.data || e.message);
    process.exit(1);
  }
})();
