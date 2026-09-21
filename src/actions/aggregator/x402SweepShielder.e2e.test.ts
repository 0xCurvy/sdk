import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Address,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  type Hex,
  hashTypedData,
  http,
  keccak256,
  parseEventLogs,
  toHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { describe, expect, it } from "vitest";
import { aggregatorAlphaV2Abi } from "@/contracts/evm/abi";
import { Core } from "@/core";
import { poseidonHash } from "@/utils/hash";

/**
 * PoC e2e for prd-011's "aggregator-receiver" x402 batch-settlement design.
 *
 * Requires a running devenv chain:
 *   cd packages/contracts/evm && HARDHAT_DEVENV=true pnpm exec hardhat run scripts/devenv.ts
 * then:
 *   X402_POC_E2E=1 pnpm --filter @0xcurvy/curvy-sdk exec vitest run src/actions/aggregator/x402SweepShielder.e2e.test.ts
 *
 * Canonical x402 side (escrow, vouchers, claims, refunds) is exercised byte-for-byte
 * against the vendored Coinbase x402BatchSettlement; the Curvy side is the devenv
 * X402SweepShielder riding the aggregator's directShield trust edge.
 *
 * Package-boundary note: this file is a TEMPORARY home. Per the demo handoff, payment
 * code belongs in @0xcurvy/payments-sdk (demo milestone M1); this test adds no runtime
 * code or exports to the core SDK and moves wholesale once that package exists.
 */

const RPC_URL = "http://127.0.0.1:8545";
const ESCROW = "0x4020074e9dF2ce1deE5A9C1b5c3f541D02a10003" as Address;
const COLLECTOR = "0x4020806089470a89826cB9fB1f4059150b550004" as Address;

// anvil default accounts #0 (facilitator/deployer) and #1 (payer/agent)
const FACILITATOR_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const PAYER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex;

const DEPOSIT = 5_000_000n; // $5.00 (6 decimals)
const PER_CALL = 1_000n; // $0.001
// Minimum session charge (handoff §"minimum session charge"): the FIRST voucher carries
// call price + worst-case claim/settle/shield cost + fees + margin, so a payer making
// one request and vanishing still leaves the merchant whole. ~310k warm sweep gas at
// L2 prices + Curvy fees + margin ≈ $0.05 for the PoC.
const SESSION_BOOTSTRAP = 50_000n; // $0.05
const EPOCH1_CALLS = 500n;
const EPOCH2_CALLS = 100n;
const EPOCH3_CALLS = 20n;

const channelConfigComponents = [
  { name: "payer", type: "address" },
  { name: "payerAuthorizer", type: "address" },
  { name: "receiver", type: "address" },
  { name: "receiverAuthorizer", type: "address" },
  { name: "token", type: "address" },
  { name: "withdrawDelay", type: "uint40" },
  { name: "salt", type: "bytes32" },
] as const;

const voucherClaimComponents = [
  {
    name: "voucher",
    type: "tuple",
    components: [
      { name: "channel", type: "tuple", components: channelConfigComponents },
      { name: "maxClaimableAmount", type: "uint128" },
    ],
  },
  { name: "signature", type: "bytes" },
  { name: "totalClaimed", type: "uint128" },
] as const;

const shieldAuthorizationComponents = [
  { name: "shieldedBefore", type: "uint256" },
  { name: "ownerHash", type: "uint256" },
  { name: "ephemeralKeyX", type: "uint256" },
  { name: "ephemeralKeyY", type: "uint256" },
  { name: "viewTag", type: "uint16" },
  { name: "minCredit", type: "uint128" },
  { name: "notBefore", type: "uint64" },
  { name: "notAfter", type: "uint64" },
] as const;

const escrowAbi = [
  {
    type: "function",
    name: "getChannelId",
    stateMutability: "view",
    inputs: [{ name: "config", type: "tuple", components: channelConfigComponents }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "getVoucherDigest",
    stateMutability: "view",
    inputs: [
      { name: "channelId", type: "bytes32" },
      { name: "maxClaimableAmount", type: "uint128" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "getClaimBatchDigest",
    stateMutability: "view",
    inputs: [{ name: "voucherClaims", type: "tuple[]", components: voucherClaimComponents }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "channels",
    stateMutability: "view",
    inputs: [{ name: "channelId", type: "bytes32" }],
    outputs: [
      { name: "balance", type: "uint128" },
      { name: "totalClaimed", type: "uint128" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "config", type: "tuple", components: channelConfigComponents },
      { name: "amount", type: "uint128" },
      { name: "collector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimWithSignature",
    stateMutability: "nonpayable",
    inputs: [
      { name: "voucherClaims", type: "tuple[]", components: voucherClaimComponents },
      { name: "authorizerSignature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundNonce",
    stateMutability: "view",
    inputs: [{ name: "channelId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getRefundDigest",
    stateMutability: "view",
    inputs: [
      { name: "channelId", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "refundWithSignature",
    stateMutability: "nonpayable",
    inputs: [
      { name: "config", type: "tuple", components: channelConfigComponents },
      { name: "amount", type: "uint128" },
      { name: "nonce", type: "uint256" },
      { name: "receiverAuthorizerSignature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const shielderAbi = [
  {
    type: "function",
    name: "shieldChannelCredit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "config", type: "tuple", components: channelConfigComponents },
      { name: "tokenId", type: "uint256" },
      { name: "authorization", type: "tuple", components: shieldAuthorizationComponents },
      { name: "authorizerSignature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getShieldAuthorizationDigest",
    stateMutability: "view",
    inputs: [
      { name: "channelId", type: "bytes32" },
      { name: "authorization", type: "tuple", components: shieldAuthorizationComponents },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "shieldedCumulative",
    stateMutability: "view",
    inputs: [{ name: "channelId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getRecoverAuthorizationDigest",
    stateMutability: "view",
    inputs: [
      { name: "channelId", type: "bytes32" },
      { name: "shieldedBefore", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "recoverChannelCredit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "config", type: "tuple", components: channelConfigComponents },
      { name: "to", type: "address" },
      { name: "authorizerSignature", type: "bytes" },
    ],
    outputs: [],
  },
  { type: "function", name: "aggregator", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "vault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "error",
    name: "ShieldWatermarkMismatch",
    inputs: [
      { name: "expected", type: "uint256" },
      { name: "actual", type: "uint256" },
    ],
  },
  { type: "error", name: "DirectShieldDisabled", inputs: [] },
  { type: "error", name: "InvalidAuthorizerSignature", inputs: [] },
] as const;

const tokenAbi = [
  {
    type: "function",
    name: "mockMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const vaultAbi = [
  { type: "function", name: "depositFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint96" }] },
  {
    type: "function",
    name: "getTokenAddress",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "perTokenGasFees",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "tokenId", type: "uint256" },
          { name: "portalDeployment", type: "uint256" },
          { name: "pendingNoteCommitment", type: "uint256" },
          { name: "withdrawal", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const run = process.env.X402_POC_E2E === "1";
const d = run ? describe : describe.skip;

d("x402 aggregator-receiver PoC (anvil devenv)", () => {
  it("canonical channel → vouchers → claim → shieldChannelCredit → PendingNotes, twice on one channel, then refund", async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const addressesPath = resolve(
      here,
      "../../../../../contracts/evm/ignition/deployments/local_anvil/deployed_addresses.json",
    );
    const deployed = JSON.parse(readFileSync(addressesPath, "utf8")) as Record<string, Address>;
    const findDeployed = (suffix: string): Address => {
      const key = Object.keys(deployed).find((k) => k.endsWith(suffix));
      if (!key) throw new Error(`missing ${suffix} in ${addressesPath}`);
      return deployed[key];
    };
    const shielder = findDeployed("#X402SweepShielder");
    const token = findDeployed("#EIP3009TokenMock");

    const publicClient = createPublicClient({ chain: foundry, transport: http(RPC_URL) });
    const facilitator = privateKeyToAccount(FACILITATOR_KEY);
    const payer = privateKeyToAccount(PAYER_KEY);
    const merchantAuthorizer = privateKeyToAccount(generatePrivateKey()); // A₁ — signs only, never funded
    const wallet = createWalletClient({ chain: foundry, transport: http(RPC_URL) });

    const write = async (account: typeof facilitator, params: Parameters<typeof publicClient.simulateContract>[0]) => {
      const { request } = await publicClient.simulateContract({ ...params, account });
      const hash = await wallet.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).toBe("success");
      return receipt;
    };

    const aggregator = await publicClient.readContract({
      address: shielder,
      abi: shielderAbi,
      functionName: "aggregator",
    });
    const vault = await publicClient.readContract({ address: shielder, abi: shielderAbi, functionName: "vault" });

    // Resolve the vault token id of the EIP-3009 mock at runtime (devenv registers it third).
    let tokenId = 0n;
    for (let id = 1n; id <= 8n; id++) {
      const addr = await publicClient
        .readContract({ address: vault, abi: vaultAbi, functionName: "getTokenAddress", args: [id] })
        .catch(() => undefined);
      if (addr && addr.toLowerCase() === token.toLowerCase()) {
        tokenId = id;
        break;
      }
    }
    expect(tokenId).toBeGreaterThan(0n);

    const depositFee = await publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "depositFee" });
    const gasFees = await publicClient.readContract({
      address: vault,
      abi: vaultAbi,
      functionName: "perTokenGasFees",
      args: [tokenId],
    });
    const expectedNet = (gross: bigint) =>
      gross - (gross * BigInt(depositFee)) / 10_000n - gasFees.pendingNoteCommitment;

    // Merchant Curvy identity + fresh per-sweep stealth notes.
    const core = new Core();
    const merchant = await core.generateKeyPairs();

    await write(facilitator, {
      address: token,
      abi: tokenAbi,
      functionName: "mockMint",
      args: [payer.address, 10_000_000n],
    });

    // ---- Channel open (canonical): receiver = shielder (global), authorizer = fresh A₁ ----
    const config = {
      payer: payer.address,
      payerAuthorizer: payer.address,
      receiver: shielder,
      receiverAuthorizer: merchantAuthorizer.address,
      token,
      withdrawDelay: 900,
      salt: keccak256(toHex("curvy-x402-poc-channel-1")),
    } as const;
    const channelId = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getChannelId",
      args: [config],
    });

    // Deposit $5 through the ERC-3009 collector (payer signs receiveWithAuthorization to it).
    const depositSalt = 1n;
    const authNonce = keccak256(
      encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [channelId, depositSalt]),
    );
    const receiveAuthSig = await payer.signTypedData({
      domain: { name: "Local USDC", version: "2", chainId: foundry.id, verifyingContract: token },
      types: {
        ReceiveWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "ReceiveWithAuthorization",
      message: {
        from: payer.address,
        to: COLLECTOR,
        value: DEPOSIT,
        validAfter: 0n,
        validBefore: 10n ** 12n,
        nonce: authNonce,
      },
    });
    const collectorData = encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
      [0n, 10n ** 12n, depositSalt, receiveAuthSig],
    );
    const depositReceipt = await write(facilitator, {
      address: ESCROW,
      abi: escrowAbi,
      functionName: "deposit",
      args: [config, DEPOSIT, COLLECTOR, collectorData],
    });

    // ---- Off-chain: 500 calls at $0.001, cumulative payer-signed vouchers ----
    const voucherDomain = {
      name: "x402 Batch Settlement",
      version: "1",
      chainId: foundry.id,
      verifyingContract: ESCROW,
    } as const;
    const voucherTypes = {
      Voucher: [
        { name: "channelId", type: "bytes32" },
        { name: "maxClaimableAmount", type: "uint128" },
      ],
    } as const;
    const signVoucher = (maxClaimableAmount: bigint) =>
      payer.signTypedData({
        domain: voucherDomain,
        types: voucherTypes,
        primaryType: "Voucher",
        message: { channelId, maxClaimableAmount },
      });

    // Sanity: our local EIP-712 encoding must equal the escrow's digest.
    const localDigest = hashTypedData({
      domain: voucherDomain,
      types: voucherTypes,
      primaryType: "Voucher",
      message: { channelId, maxClaimableAmount: PER_CALL },
    });
    const escrowDigest = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getVoucherDigest",
      args: [channelId, PER_CALL],
    });
    expect(localDigest).toBe(escrowDigest);

    // The first voucher carries the minimum session charge on top of the first call —
    // after one request the payer already owes the merchant's worst-case sweep cost.
    let cumulative = 0n;
    let lastVoucherSig: Hex = "0x";
    for (let i = 0n; i < EPOCH1_CALLS; i++) {
      cumulative += PER_CALL + (i === 0n ? SESSION_BOOTSTRAP : 0n);
      lastVoucherSig = await signVoucher(cumulative);
    }
    expect(cumulative).toBe(SESSION_BOOTSTRAP + PER_CALL * EPOCH1_CALLS);

    // ---- Claim epoch 1 (merchant-signed batch, facilitator submits) ----
    const claimRows1 = [
      {
        voucher: { channel: config, maxClaimableAmount: cumulative },
        signature: lastVoucherSig,
        totalClaimed: cumulative,
      },
    ];
    const batchDigest1 = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getClaimBatchDigest",
      args: [claimRows1],
    });
    const claimReceipt1 = await write(facilitator, {
      address: ESCROW,
      abi: escrowAbi,
      functionName: "claimWithSignature",
      args: [claimRows1, await merchantAuthorizer.sign({ hash: batchDigest1 })],
    });
    const afterClaim1 = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "channels",
      args: [channelId],
    });
    expect(afterClaim1[1]).toBe(cumulative);

    // ---- Shield epoch 1: fresh stealth note, merchant-signed, anyone submits ----
    const note1 = await core.sendNote(merchant.S, merchant.V, {
      ownerBabyJubjubPublicKey: merchant.babyJubjubPublicKey,
      amount: cumulative,
      token: tokenId,
    });
    const authorization1 = {
      shieldedBefore: 0n,
      ownerHash: note1.ownerHash,
      ephemeralKeyX: note1.ephemeralKey[0],
      ephemeralKeyY: note1.ephemeralKey[1],
      viewTag: Number(note1.viewTag),
      minCredit: cumulative,
      notBefore: 0n,
      notAfter: (1n << 64n) - 1n,
    };
    const shieldDigest1 = await publicClient.readContract({
      address: shielder,
      abi: shielderAbi,
      functionName: "getShieldAuthorizationDigest",
      args: [channelId, authorization1],
    });
    const shieldSig1 = await merchantAuthorizer.sign({ hash: shieldDigest1 });

    // Negative: a facilitator tampering with the note (redirect attempt) must fail.
    await expect(
      publicClient.simulateContract({
        account: facilitator,
        address: shielder,
        abi: shielderAbi,
        functionName: "shieldChannelCredit",
        args: [config, tokenId, { ...authorization1, ownerHash: authorization1.ownerHash + 1n }, shieldSig1],
      }),
    ).rejects.toThrow(/InvalidAuthorizerSignature/);

    const shieldReceipt1 = await write(facilitator, {
      address: shielder,
      abi: shielderAbi,
      functionName: "shieldChannelCredit",
      args: [config, tokenId, authorization1, shieldSig1],
    });
    const pendingNotesFrom = (logs: (typeof shieldReceipt1)["logs"]) =>
      parseEventLogs({ abi: aggregatorAlphaV2Abi, eventName: "PendingNotes", logs }).filter(
        (log) => log.address.toLowerCase() === aggregator.toLowerCase(),
      );
    const pending1 = pendingNotesFrom(shieldReceipt1.logs);
    expect(pending1).toHaveLength(1);
    const net1 = expectedNet(cumulative);
    expect(pending1[0].args.amounts[0]).toBe(net1);
    expect(pending1[0].args.noteIds[0]).toBe(poseidonHash([note1.ownerHash, net1, tokenId]));
    expect(pending1[0].args.viewTags[0]).toBe(Number(note1.viewTag));

    // Negative: replaying the same authorization must fail (watermark advanced).
    await expect(
      publicClient.simulateContract({
        account: facilitator,
        address: shielder,
        abi: shielderAbi,
        functionName: "shieldChannelCredit",
        args: [config, tokenId, authorization1, shieldSig1],
      }),
    ).rejects.toThrow(/ShieldWatermarkMismatch/);

    // ---- Epoch 2 on the SAME channel — no rotation, no new capital ----
    for (let i = 0n; i < EPOCH2_CALLS; i++) {
      cumulative += PER_CALL;
      lastVoucherSig = await signVoucher(cumulative);
    }
    const claimRows2 = [
      {
        voucher: { channel: config, maxClaimableAmount: cumulative },
        signature: lastVoucherSig,
        totalClaimed: cumulative,
      },
    ];
    const batchDigest2 = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getClaimBatchDigest",
      args: [claimRows2],
    });
    const claimReceipt2 = await write(facilitator, {
      address: ESCROW,
      abi: escrowAbi,
      functionName: "claimWithSignature",
      args: [claimRows2, await merchantAuthorizer.sign({ hash: batchDigest2 })],
    });

    const shieldedAfterEpoch1 = SESSION_BOOTSTRAP + PER_CALL * EPOCH1_CALLS;
    const epoch2Credit = PER_CALL * EPOCH2_CALLS;
    const note2 = await core.sendNote(merchant.S, merchant.V, {
      ownerBabyJubjubPublicKey: merchant.babyJubjubPublicKey,
      amount: epoch2Credit,
      token: tokenId,
    });
    const authorization2 = {
      shieldedBefore: shieldedAfterEpoch1,
      ownerHash: note2.ownerHash,
      ephemeralKeyX: note2.ephemeralKey[0],
      ephemeralKeyY: note2.ephemeralKey[1],
      viewTag: Number(note2.viewTag),
      minCredit: epoch2Credit,
      notBefore: 0n,
      notAfter: (1n << 64n) - 1n,
    };
    const shieldDigest2 = await publicClient.readContract({
      address: shielder,
      abi: shielderAbi,
      functionName: "getShieldAuthorizationDigest",
      args: [channelId, authorization2],
    });
    const shieldReceipt2 = await write(facilitator, {
      address: shielder,
      abi: shielderAbi,
      functionName: "shieldChannelCredit",
      args: [config, tokenId, authorization2, await merchantAuthorizer.sign({ hash: shieldDigest2 })],
    });
    const pending2 = pendingNotesFrom(shieldReceipt2.logs);
    const net2 = expectedNet(epoch2Credit);
    expect(pending2[0].args.noteIds[0]).toBe(poseidonHash([note2.ownerHash, net2, tokenId]));
    // Fresh stealth delivery per sweep — the two notes share nothing observable.
    expect(note2.ownerHash).not.toBe(note1.ownerHash);
    expect(note2.ephemeralKey[0]).not.toBe(note1.ephemeralKey[0]);

    expect(
      await publicClient.readContract({
        address: shielder,
        abi: shielderAbi,
        functionName: "shieldedCumulative",
        args: [channelId],
      }),
    ).toBe(cumulative);

    // ---- Epoch 3: hard self-custody — authority kills directShield, merchant still exits ----
    for (let i = 0n; i < EPOCH3_CALLS; i++) {
      cumulative += PER_CALL;
      lastVoucherSig = await signVoucher(cumulative);
    }
    const claimRows3 = [
      {
        voucher: { channel: config, maxClaimableAmount: cumulative },
        signature: lastVoucherSig,
        totalClaimed: cumulative,
      },
    ];
    const batchDigest3 = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getClaimBatchDigest",
      args: [claimRows3],
    });
    await write(facilitator, {
      address: ESCROW,
      abi: escrowAbi,
      functionName: "claimWithSignature",
      args: [claimRows3, await merchantAuthorizer.sign({ hash: batchDigest3 })],
    });

    // Protocol authority (devenv deployer) flips the aggregator's direct-shield switch off.
    await write(facilitator, {
      address: aggregator,
      abi: aggregatorAlphaV2Abi,
      functionName: "setDirectShieldEnabled",
      args: [false],
    });

    const shieldedAfterEpoch2 = shieldedAfterEpoch1 + epoch2Credit;
    const epoch3Credit = PER_CALL * EPOCH3_CALLS;
    const note3 = await core.sendNote(merchant.S, merchant.V, {
      ownerBabyJubjubPublicKey: merchant.babyJubjubPublicKey,
      amount: epoch3Credit,
      token: tokenId,
    });
    const authorization3 = {
      shieldedBefore: shieldedAfterEpoch2,
      ownerHash: note3.ownerHash,
      ephemeralKeyX: note3.ephemeralKey[0],
      ephemeralKeyY: note3.ephemeralKey[1],
      viewTag: Number(note3.viewTag),
      minCredit: epoch3Credit,
      notBefore: 0n,
      notAfter: (1n << 64n) - 1n,
    };
    const shieldDigest3 = await publicClient.readContract({
      address: shielder,
      abi: shielderAbi,
      functionName: "getShieldAuthorizationDigest",
      args: [channelId, authorization3],
    });
    // With direct shield disabled the shield path is dead — but funds are NOT stranded.
    await expect(
      publicClient.simulateContract({
        account: facilitator,
        address: shielder,
        abi: shielderAbi,
        functionName: "shieldChannelCredit",
        args: [config, tokenId, authorization3, await merchantAuthorizer.sign({ hash: shieldDigest3 })],
      }),
    ).rejects.toThrow(/DirectShieldDisabled/);

    const recoveryDestination = privateKeyToAccount(generatePrivateKey()).address;
    const recoverDigest = await publicClient.readContract({
      address: shielder,
      abi: shielderAbi,
      functionName: "getRecoverAuthorizationDigest",
      args: [channelId, shieldedAfterEpoch2, recoveryDestination, epoch3Credit],
    });
    const recoverReceipt = await write(facilitator, {
      address: shielder,
      abi: shielderAbi,
      functionName: "recoverChannelCredit",
      args: [config, recoveryDestination, await merchantAuthorizer.sign({ hash: recoverDigest })],
    });
    expect(
      await publicClient.readContract({
        address: token,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [recoveryDestination],
      }),
    ).toBe(epoch3Credit);

    // Restore devenv state for whoever uses the chain next.
    await write(facilitator, {
      address: aggregator,
      abi: aggregatorAlphaV2Abi,
      functionName: "setDirectShieldEnabled",
      args: [true],
    });

    // ---- Cooperative refund of unused capital (canonical, merchant-authorized) ----
    const remainder = DEPOSIT - cumulative;
    const refundNonce = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "refundNonce",
      args: [channelId],
    });
    const refundDigest = await publicClient.readContract({
      address: ESCROW,
      abi: escrowAbi,
      functionName: "getRefundDigest",
      args: [channelId, refundNonce, remainder],
    });
    const payerBalanceBefore = await publicClient.readContract({
      address: token,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [payer.address],
    });
    await write(facilitator, {
      address: ESCROW,
      abi: escrowAbi,
      functionName: "refundWithSignature",
      args: [config, remainder, refundNonce, await merchantAuthorizer.sign({ hash: refundDigest })],
    });
    const payerBalanceAfter = await publicClient.readContract({
      address: token,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [payer.address],
    });
    expect(payerBalanceAfter - payerBalanceBefore).toBe(remainder);

    // ---- PoC gas report ----
    const perCall = (gas: bigint, calls: bigint) => `${gas / calls} gas/call`;
    console.log("\n=== x402 aggregator-receiver PoC — gas ===");
    console.log(`channel deposit (EIP-3009 via collector): ${depositReceipt.gasUsed}`);
    console.log(
      `claim epoch 1 (500 calls):                ${claimReceipt1.gasUsed}  (${perCall(claimReceipt1.gasUsed, EPOCH1_CALLS)})`,
    );
    console.log(
      `shield epoch 1 (settle+directShield):     ${shieldReceipt1.gasUsed}  (${perCall(shieldReceipt1.gasUsed, EPOCH1_CALLS)})`,
    );
    console.log(`claim epoch 2 (100 calls):                ${claimReceipt2.gasUsed}`);
    console.log(`shield epoch 2 (same channel, no churn):  ${shieldReceipt2.gasUsed}`);
    console.log(`recovery exit (directShield disabled):    ${recoverReceipt.gasUsed}`);
    const fixed1 = claimReceipt1.gasUsed + shieldReceipt1.gasUsed;
    console.log(`epoch-1 fixed total: ${fixed1} gas → ${fixed1 / EPOCH1_CALLS} gas per $0.001 call`);
  }, 240_000);
});
