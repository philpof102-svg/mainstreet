# Deploy MAIN token to Base mainnet

5 minutes via Remix. No npm setup needed.

## Steps

### 1. Open Remix

https://remix.ethereum.org

### 2. New file → `Main.sol`

Paste the contents of `contracts/Main.sol` from this repo.

### 3. Compile

- Left sidebar → **Solidity compiler**
- Compiler version: `0.8.24` (or 0.8.20+)
- EVM version: leave default
- Click **Compile Main.sol**

### 4. Deploy to Base mainnet

- Left sidebar → **Deploy & run transactions**
- Environment: **Injected Provider — MetaMask** (or Coinbase Wallet, Base App, Rabby — whichever is your injected wallet)
- Make sure your wallet is connected to **Base mainnet** (chain 8453)
- Contract: select **Main**
- Constructor inputs:
  - `mintReceiver`: `0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9`  (Mainstreet operator wallet)
  - `supply`: `1000000000000000000000000`  (= 1,000,000 * 10^18, the 1M MAIN with 18 decimals)
- Click **Deploy**, sign in your wallet.

Cost: ~$0.30–$0.80 in ETH gas on Base.

### 5. Copy the deployed address

After confirmation, Remix shows the deployed contract address at the bottom-left. Copy it.

It looks like: `0xABCDEF...123456`.

### 6. Verify on Basescan (recommended)

- Open https://basescan.org/address/&lt;your-deployed-address&gt;
- Tab **Contract** → **Verify and Publish**
- Compiler: `0.8.24` (or whatever you used)
- License: MIT
- Paste the `Main.sol` source code
- Submit

Verification takes ~30 seconds. After it's done your contract page shows the source code publicly, which is required for trust and for Talent Protocol/Basescan signal.

### 7. Paste in Talent Protocol

Talent project edit page → **Token contract address** → Base → paste the deployed address.

### 8. Add to Mainstreet README

After deploy, edit `README.md` in this repo to add:

```
## Token

- Name: Mainstreet
- Symbol: MAIN
- Contract: [`0xYOUR_ADDRESS`](https://basescan.org/address/0xYOUR_ADDRESS) on Base
- Total supply: 1,000,000 MAIN (fixed, immutable)
- Minted to: operator wallet 0xAC3ca7c5d3cDD7702fd08F9C4C28dAA22296aDa9
```

Then `git commit + git push`.

## Why this design

- **Immutable**: no admin, no upgrade, no mint after deploy. Can't be rugged.
- **No initial LP**: token has no market price yet. Liquidity decision happens later, deliberately.
- **Fixed supply 1M**: small and round. Easy to talk about. 18 decimals (standard ERC-20).
- **Inline source (no OZ)**: zero dependency, deploys from Remix with no setup. Behaves identically to OZ ERC20 standard.

## What this token does NOT do (yet)

- No staking, no rewards, no claim
- No utility binding to the Mainstreet API
- No vesting, no team allocation
- No DAO

These are future decisions, not v1 decisions. Shipping a clean inert ERC-20 first is better than shipping a half-baked tokenomics.
