import type { CurvyIntent } from "@/planner/plan"
import { generatePlan } from "@/planner/planner";
import { CurvySDK } from "@/sdk";
import type { BalanceEntry, EvmSignatureData } from "@/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TARGET_NETWORKS = [
  "arbitrum",
  // "ethereum",
  // "linea",
  // "gnosis",
  // "bsc",
  // "optimism",
  // "base",
  // "polygon"
];

const TARGET_ADDRESS = "0x61826700275C96633c85A6563BffcBb2E9e82dc6";

const AMOUNTS: Record<string, string> = {
  "ETH": "0.0005",
  "USDC": "1",
};

async function sendFunds(curvySDK: CurvySDK, activeWalletId: string, networkName: string, currencySymbol: string) {
  console.log(`\n--- Sending ${currencySymbol} on ${networkName} ---`);
  
  const network = curvySDK.getNetwork(networkName);
  if (!network) {
    console.error(`⚠️ Network ${networkName} not found in CurvySDK configurations. Skipping.`);
    return;
  }

  const currency = network.currencies.find((c: any) => c.symbol === currencySymbol);
  if (!currency) {
    console.error(`⚠️ Currency ${currencySymbol} not found on network ${networkName}. Skipping.`);
    return;
  }

  const balances: BalanceEntry[] = await curvySDK.storage.getNoteBalances(activeWalletId, networkName);
  const currencyBalances = balances.filter(b => b.symbol === currencySymbol);
  const totalBalance = currencyBalances.reduce((acc, b) => acc + (b.balance || 0n), 0n);
  
  const amountStr = AMOUNTS[currencySymbol];
  const amountBigInt = BigInt(Math.floor(parseFloat(amountStr) * (10 ** currency.decimals)));

  if (totalBalance < amountBigInt) {
     console.error(`⚠️ Insufficient funds on ${networkName} for ${currencySymbol}. Required: ${amountStr}, Available: ${Number(totalBalance) / (10 ** currency.decimals)}`);
     return;
  }

  const intent: CurvyIntent = {
    recipient: TARGET_ADDRESS,
    amount: amountBigInt,
    currency: currency,
    network: network,
    type: "external-transfer",  
  };

  try {
    console.log("Generating plan...");
    const { plan } = generatePlan(balances, intent);

    console.log("Estimating plan...");
    const estimation = await curvySDK.estimatePlan(plan);

    console.log("Executing plan...");
    const result = await curvySDK.executePlan(estimation.plan);

    if (result.success) {
      console.log(`✅ ${currencySymbol} transfer successful on ${networkName}!`);
    } else {
      console.error(`❌ ${currencySymbol} transfer failed on ${networkName}.`);
      console.error(result);
    }
  } catch (err) {
    console.error(`🔥 Error during transfer on ${networkName} for ${currencySymbol}:`);
    console.error(err);
  }
}

async function executeForEnvironment(envName: string, signatureRaw: string, password: string, apiUrl?: string) {
  console.log(`\n================================`);
  console.log(`Starting execution for ${envName.toUpperCase()}`);
  console.log(`================================`);
  console.log(`Initializing CurvySDK...`);
  
  const curvySDK = await CurvySDK.init("mainnet", apiUrl);

  console.log("\nLogging in using provided signature...");
  await curvySDK.login('evm', JSON.parse(signatureRaw) as EvmSignatureData, password);

  console.log("Logged in to the Curvy system");

  const activeWalletId = curvySDK.walletManager.activeWallet.id;
  console.log(`Logged in successfully. Wallet ID: ${activeWalletId}`);

  console.log("\nRefreshing balances for all networks...");
  await curvySDK.refreshBalances({ type: "notes" });
  await sleep(1000);

  for (const networkName of TARGET_NETWORKS) {
    await sendFunds(curvySDK, activeWalletId, networkName, "ETH");
    await sendFunds(curvySDK, activeWalletId, networkName, "USDC");
  }
  
  console.log(`\nCompleted execution for ${envName.toUpperCase()}`);
}

async function main() {
  console.log("=== Daily Send Funds Script ===");

  const stagingSignature = process.env.TESTING_STAGING_SIGNATURE; 
  const stagingPassword = process.env.TESTING_STAGING_PASSWORD;
  const productionSignature = process.env.TESTING_PRODUCTION_SIGNATURE; 
  const productionPassword = process.env.TESTING_PRODUCTION_PASSWORD;

  if (stagingSignature) {
    await executeForEnvironment("Staging", stagingSignature, stagingPassword!, "https://api.curvy.dev");
  } else {
    console.warn("⚠️ Skipping Staging: Staging environment variables not completely provided.");
  }

  if (productionSignature) {
    await executeForEnvironment("Production", productionSignature, productionPassword!);
  } else {
    console.warn("⚠️ Skipping Production: Production environment variables not completely provided.");
  }

  console.log("\n=== Daily Send Funds Script Finished ===");
}

main().catch((err) => {
  console.error("\nUnhandled Error:");
  console.error(err);
  process.exit(1);
});
