import { expect, test } from "vitest";
import type { CurvyIntent } from "@/planner/plan";
import { generatePlan } from "@/planner/planner";
import { CurvySDK } from "@/sdk";
import { type BalanceEntry, CURVY_EVENT_TYPES, type Currency, type Network } from "@/types";
import { parseDecimal } from "@/utils";

const LocalnetGeneratedValues = {
  urlsCurvyOS: {
    "user-1":
      "http://localhost:5174/?apiBaseUrl=http://localhost:4000&apiKey=local&network=localnet&signatureFlavour=evm&signature={%22signatureResult%22:%220xabe15e09bf9591c6ddb71175c02210e7cc707474a0c362dc486e9770d803e918663be4d3f39a529ac3c427d2cf9e78e231b53cf5bb4e5fbbc24d4ca3b6455d6c1b%22,%22signatureParams%22:{%22domain%22:{%22name%22:%22Curvy%20Protocol%22,%22version%22:%221.0.0%22,%22chainId%22:1},%22message%22:{%22title%22:%22Curvy%20Protocol%20says%20%27Zdravo%27!%22,%22content%22:%22Curvy%20Protocol%20requests%20signature:%201fa652f55d183ce5cdfaef646dead811e3d5d650e78d688711e74f7b7b4013ae2d279cb256a1d81378264b8db455cfa97d790e46545e793957dd66a97efa4915%22},%22primaryType%22:%22AuthMessage%22,%22types%22:{%22EIP712Domain%22:[{%22name%22:%22name%22,%22type%22:%22string%22},{%22name%22:%22version%22,%22type%22:%22string%22},{%22name%22:%22chainId%22,%22type%22:%22uint256%22}],%22AuthMessage%22:[{%22name%22:%22title%22,%22type%22:%22string%22},{%22name%22:%22content%22,%22type%22:%22string%22}]}},%22signingAddress%22:%220xf39fd6e51aad88f6f4ce6ab8827279cfffb92266%22}",
    "user-2":
      "http://localhost:5174/?apiBaseUrl=http://localhost:4000&apiKey=local&network=localnet&signatureFlavour=evm&signature={%22signatureResult%22:%220xa5cbb9e72859729dbb0f1382ac2bc5927bd40fbb87fabdb56947301dfa63d2a443fb071470760c0cd1e29ac881e357abdba02256440f5e32e4fb96d9d59d3e181c%22,%22signatureParams%22:{%22domain%22:{%22name%22:%22Curvy%20Protocol%22,%22version%22:%221.0.0%22,%22chainId%22:1},%22message%22:{%22title%22:%22Curvy%20Protocol%20says%20%27Zdravo%27!%22,%22content%22:%22Curvy%20Protocol%20requests%20signature:%201fa652f55d183ce5cdfaef646dead811e3d5d650e78d688711e74f7b7b4013ae2d279cb256a1d81378264b8db455cfa97d790e46545e793957dd66a97efa4915%22},%22primaryType%22:%22AuthMessage%22,%22types%22:{%22EIP712Domain%22:[{%22name%22:%22name%22,%22type%22:%22string%22},{%22name%22:%22version%22,%22type%22:%22string%22},{%22name%22:%22chainId%22,%22type%22:%22uint256%22}],%22AuthMessage%22:[{%22name%22:%22title%22,%22type%22:%22string%22},{%22name%22:%22content%22,%22type%22:%22string%22}]}},%22signingAddress%22:%220x70997970c51812dc3a010c7d01b50e0d17dc79c8%22}",
    "user-3":
      "http://localhost:5174/?apiBaseUrl=http://localhost:4000&apiKey=local&network=localnet&signatureFlavour=evm&signature={%22signatureResult%22:%220x5455b69e583ad2d18c560af191cb9f55a96f71aff35044bceefc8d624e13defb7564f15100eef076c96c388bfc2ef81806de8b9dc8a14e31c8f7b9c729c3ab7d1b%22,%22signatureParams%22:{%22domain%22:{%22name%22:%22Curvy%20Protocol%22,%22version%22:%221.0.0%22,%22chainId%22:1},%22message%22:{%22title%22:%22Curvy%20Protocol%20says%20%27Zdravo%27!%22,%22content%22:%22Curvy%20Protocol%20requests%20signature:%201fa652f55d183ce5cdfaef646dead811e3d5d650e78d688711e74f7b7b4013ae2d279cb256a1d81378264b8db455cfa97d790e46545e793957dd66a97efa4915%22},%22primaryType%22:%22AuthMessage%22,%22types%22:{%22EIP712Domain%22:[{%22name%22:%22name%22,%22type%22:%22string%22},{%22name%22:%22version%22,%22type%22:%22string%22},{%22name%22:%22chainId%22,%22type%22:%22uint256%22}],%22AuthMessage%22:[{%22name%22:%22title%22,%22type%22:%22string%22},{%22name%22:%22content%22,%22type%22:%22string%22}]}},%22signingAddress%22:%220x3c44cdddb6a900fa2b585dd299e03d12fa4293bc%22}",
  },
  initialUserLoggedInUrl:
    "http://localhost:5174/?apiBaseUrl=http://localhost:4000&apiKey=local&network=localnet&signatureFlavour=evm&signature={%22signatureResult%22:%220xabe15e09bf9591c6ddb71175c02210e7cc707474a0c362dc486e9770d803e918663be4d3f39a529ac3c427d2cf9e78e231b53cf5bb4e5fbbc24d4ca3b6455d6c1b%22,%22signatureParams%22:{%22domain%22:{%22name%22:%22Curvy%20Protocol%22,%22version%22:%221.0.0%22,%22chainId%22:1},%22message%22:{%22title%22:%22Curvy%20Protocol%20says%20%27Zdravo%27!%22,%22content%22:%22Curvy%20Protocol%20requests%20signature:%201fa652f55d183ce5cdfaef646dead811e3d5d650e78d688711e74f7b7b4013ae2d279cb256a1d81378264b8db455cfa97d790e46545e793957dd66a97efa4915%22},%22primaryType%22:%22AuthMessage%22,%22types%22:{%22EIP712Domain%22:[{%22name%22:%22name%22,%22type%22:%22string%22},{%22name%22:%22version%22,%22type%22:%22string%22},{%22name%22:%22chainId%22,%22type%22:%22uint256%22}],%22AuthMessage%22:[{%22name%22:%22title%22,%22type%22:%22string%22},{%22name%22:%22content%22,%22type%22:%22string%22}]}},%22signingAddress%22:%220xf39fd6e51aad88f6f4ce6ab8827279cfffb92266%22}",
};

let curvySDK: CurvySDK;
let activeWalletId: string;
let network: Network;
let currency: Currency;
let balances: BalanceEntry[];

const doPlan = async (intent: CurvyIntent): Promise<boolean> => {
  const { plan } = generatePlan(balances, intent);

  const executor = curvySDK.commandExecutor;

  const estimation = await executor.estimatePlan(plan);

  const result = await executor.executePlan(estimation.plan, curvySDK.walletManager.activeWallet.id);

  return result.success;
};

async function setup() {
  curvySDK = await CurvySDK.init("local", "localnet", "http://localhost:4000");

  const urlParams = new URLSearchParams(LocalnetGeneratedValues.urlsCurvyOS["user-1"]);
  const signature = urlParams.get("signature");
  //@ts-expect-error
  await curvySDK.walletManager.addWalletWithSignature("evm", JSON.parse(decodeURIComponent(signature)));

  expect(curvySDK.walletManager.wallets).toHaveLength(1);

  activeWalletId = curvySDK.walletManager.activeWallet.id;

  let syncComplete = false;
  curvySDK.on(CURVY_EVENT_TYPES.SYNC_COMPLETE, async (event) => {
    console.log(event);
    syncComplete = true;
  });

  let retries = 0;

  while (!syncComplete) {
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(retries).toBeLessThanOrEqual(100);
  }

  let balanceRefreshComplete = false;
  curvySDK.on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, async (event) => {
    console.log(event);
    balanceRefreshComplete = true;
  });

  await curvySDK.refreshBalances(true);

  while (!balanceRefreshComplete) {
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(retries).toBeLessThanOrEqual(100);
  }

  expect(curvySDK.walletManager.activeWallet.ownerAddress).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");

  network = curvySDK.getNetwork("localnet");
  if (!network) {
    throw new Error("Network not found");
  }

  currency = network.currencies.find((c) => c.symbol === "ETH")!;
  if (!currency) {
    console.log("Currency not found");
  }

  balances = await curvySDK.storage.getBalanceSources(
    activeWalletId,
    currency!.contractAddress,
    network!.name.replace(" ", "-").toLowerCase(),
  );
}

test("Inclusion proof bug", async () => {
  await setup();
  // const to = "devenv1.local-curvy.name";
  const to = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const amount1 = parseDecimal("330", currency!);

  const intent1: CurvyIntent = {
    toAddress: to,
    amount: amount1,
    currency: currency!,
    network: network!,
  };

  const planResult1 = await doPlan(intent1);
  expect(planResult1).toBe(true);

  await setup();

  const planResult12 = await doPlan(intent1);
  expect(planResult12).toBe(true);

  await setup();

  const amount2 = parseDecimal("700", currency!);

  const intent2: CurvyIntent = {
    toAddress: to,
    amount: amount2,
    currency: currency!,
    network: network!,
  };

  const planResult2 = await doPlan(intent2);
  expect(planResult2).toBe(true);
}, 600_000);

test("Vault withdraw bug", async () => {
  await setup();
  const to = "0x6718a78b04FA537c58EbF88fE17A84248eD64542";
  const amount1 = parseDecimal("10", currency!);

  const intent1: CurvyIntent = {
    toAddress: to,
    amount: amount1,
    currency: currency!,
    network: network!,
  };

  const planResult1 = await doPlan(intent1);
  expect(planResult1).toBe(true);
}, 600_000);
