#!/usr/bin/env node
/**
 * Deploy MAIN token to Base mainnet using the Mainstreet operator wallet.
 *
 * Pre-requisites:
 *  - Mainstreet wallet (MAINSTREET_OPERATOR_PRIVATE_KEY in .env) funded
 *    with at least ~0.0003 ETH on Base for gas.
 *  - File scripts/main-token.compiled.json must exist (run compile first).
 *
 * Usage:
 *   node scripts/deploy-main-token.js
 *
 * On success, prints the deployed address and writes it to
 * scripts/main-token.deployed.json.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http, parseUnits } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const COMPILED_PATH = path.join(__dirname, 'main-token.compiled.json');
const DEPLOYED_PATH = path.join(__dirname, 'main-token.deployed.json');

async function main() {
  if (!fs.existsSync(COMPILED_PATH)) {
    console.error('compile artifact missing — run: node scripts/compile-main-token.js');
    process.exit(1);
  }
  const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, 'utf8'));

  const pk = process.env.MAINSTREET_OPERATOR_PRIVATE_KEY;
  if (!pk || !/^0x[a-fA-F0-9]{64}$/.test(pk)) {
    console.error('MAINSTREET_OPERATOR_PRIVATE_KEY missing or invalid in .env');
    process.exit(1);
  }
  const account = privateKeyToAccount(pk);
  console.log('deployer        :', account.address);

  const transport = http(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
  const publicClient = createPublicClient({ chain: base, transport });
  const walletClient = createWalletClient({ chain: base, account, transport });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log('balance         :', Number(balance) / 1e18, 'ETH');

  // Estimated cost: ~250k gas * ~0.001 gwei = ~0.00025 ETH minimum
  const MIN_BALANCE = parseUnits('0.0003', 18);
  if (balance < MIN_BALANCE) {
    console.error('\n❌ Insufficient balance for deploy.');
    console.error('   Need ~0.0003 ETH on Base (~$1).');
    console.error('   Send some ETH to:', account.address, 'on Base mainnet, then retry.');
    process.exit(1);
  }

  // mintReceiver = operator wallet (this same account), supply 1M with 18 decimals
  const mintReceiver = account.address;
  const supply = parseUnits('1000000', 18); // 1,000,000 MAIN

  console.log('mintReceiver    :', mintReceiver);
  console.log('supply          :', supply.toString(), '(1,000,000 MAIN)');
  console.log('chain           : Base mainnet (8453)');
  console.log('');
  console.log('deploying...');

  const hash = await walletClient.deployContract({
    abi: compiled.abi,
    bytecode: compiled.bytecode,
    args: [mintReceiver, supply],
  });
  console.log('tx hash         :', hash);
  console.log('waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status !== 'success') {
    console.error('❌ deploy reverted');
    process.exit(1);
  }

  console.log('\n✓ deployed at   :', receipt.contractAddress);
  console.log('  block         :', receipt.blockNumber);
  console.log('  gas used      :', receipt.gasUsed.toString());
  console.log('  basescan      : https://basescan.org/address/' + receipt.contractAddress);

  fs.writeFileSync(DEPLOYED_PATH, JSON.stringify({
    address: receipt.contractAddress,
    deployer: account.address,
    mintReceiver,
    supply: supply.toString(),
    txHash: hash,
    block: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    chain: 'base-mainnet',
  }, null, 2));

  console.log('\n→ saved:', DEPLOYED_PATH);
  console.log('→ paste this address in Talent Protocol token field:');
  console.log('   ' + receipt.contractAddress);
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  if (err.cause) console.error('cause:', err.cause.message || err.cause);
  process.exit(1);
});
