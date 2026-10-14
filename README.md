# Toss

Send USDC to anyone with a link, on Arc. The recipient taps the link and the money lands in a wallet created on the
spot — no app, no seed phrase, no gas token. Unclaimed money can be taken back by the sender at any time.

Arc pays gas in USDC, so a relayer submits the claim and is reimbursed a small, capped USDC fee out of the deposit.
No gas sponsor is needed.

```
smartcontract/   Foundry project: Toss.sol escrow, tests, deploy scripts
frontend/        Next.js app: send / claim / wallet / my-links pages + relayer API routes
```

## Network

| | |
|---|---|
| Chain | Arc mainnet, chain ID `5042` |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | https://explorer.arc.io |
| USDC (ERC-20 interface, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| **Toss contract** | [`0x83b2b7b0A4EeB7d47C02e21e49ab30219Df638f6`](https://explorer.arc.io/address/0x83b2b7b0A4EeB7d47C02e21e49ab30219Df638f6) |

All contract accounting uses the 6-decimal ERC-20 interface. The native balance of the same USDC is reported with
18 decimals; never mix the two.

## Smart contract

```bash
cd smartcontract
forge test
```

`Toss.sol`:
- `deposit(claimKey, amount, expiry)` locks USDC to a one-time key address (expiry 1 hour–30 days).
- `claim(claimKey, recipient, fee, deadline, sig)` releases it to `recipient` when `sig` is an EIP-712 signature by
  `claimKey`. The fee (capped at `maxFee`) goes to the caller (the relayer). Chain ID and contract address are in the
  signed domain.
- `refund(claimKey)` returns an unclaimed deposit to its sender, at any time.

Deploy to Arc mainnet (use an encrypted keystore, not a raw key):

```bash
cast wallet import toss-deployer --interactive
forge script script/Deploy.s.sol --rpc-url arc --account toss-deployer --broadcast
```

Arc's USDC is backed by a native precompile that local forks can't execute, so mainnet behaviour can't be tested on
an anvil fork. Use `script/DeployLocal.s.sol` with a mock USDC for local runs, then verify on mainnet with small
amounts.

## Frontend + relayer

```bash
cd frontend
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_TOSS_ADDRESS and RELAYER_PK
pnpm dev
```

The relayer is two API routes in the same app:
- `GET /api/quote` returns the fee (gas cost × 1.5, capped at the contract's `maxFee`) and a signing deadline.
- `POST /api/claim` checks the request, simulates the claim (so it never pays gas for a failing one), and submits it.

Fund the `RELAYER_PK` address with a few USDC on Arc; that balance pays gas and is topped up by claim fees.

### Wallets

- **Toss wallet** (default on phones): a key in browser storage. Create it on `/wallet` or by claiming a link, fund it
  from "Add money" (QR + address, USDC on Arc only), and send links from it. Backup is prompted before funding.
- **Browser wallet**: any injected wallet (MetaMask, Rabby, Coinbase Wallet extension), shown when one is present.
- **Wallet app** (optional): set `NEXT_PUBLIC_WC_PROJECT_ID` (free at https://cloud.reown.com) to let phone users
  connect MetaMask Mobile, Rainbow, Trust and others over WalletConnect. The CSP opens WalletConnect origins only when
  this is set.

### Local end-to-end

```bash
anvil
cd smartcontract && forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# frontend/.env.local:
#   NEXT_PUBLIC_CHAIN=local
#   NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
#   NEXT_PUBLIC_TOSS_ADDRESS=<Toss from the script output>
#   NEXT_PUBLIC_USDC_ADDRESS=<MockUSDC from the script output>
#   RELAYER_PK=<another anvil key>
```

## Security notes

- The one-time key lives only in the URL fragment, which browsers never send to servers. The claim page strips it
  from the address bar on load and keeps it in session storage for that tab only.
- The claim page never claims automatically, so email link scanners that load the page can't move funds.
- A claim signature is bound to one recipient and fee; copying it can't redirect funds or raise the fee.
- Anyone who has the link can claim it. The UI says so plainly.
- The recipient's Toss wallet is a key in browser storage. The app requires a backup step and offers
  "send everything to my other wallet".
