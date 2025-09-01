//@ts-nocheck
import { test } from "vitest";
import { CurvySDK } from "@/sdk";
import { SendNativeCurrencyCommand } from "@/commands/send-native-currency";
import { CurvyIntent } from "@/commands/interface";

test("should run a single command test", async () => {
  const sdk = await CurvySDK.init("thisisateststagingapikey", "ethgereum-sepolia", "http://api.curvy.dev");
  const cmd = sdk.commmander;

  // Balances for a specific currency on a specific network.
  const balances = {
    "sa": [
      { amount: 0.2, address: "0xafe23..."},
      { amount: 3, address: "0xdf423..."}
    ],
    "csuc": [
      { amount: 1, address: "0xbeef44..."},
      { amount: 2, address: "0xc830..."}
    ],
    "note": [
      { amount: 0.32 /** more note-specific fields **/ }
    ]
  }

  const network = sdk.getNetwork("ethereum-sepolia");

  const currency = network.currencies.find((c) => c.symbol === "USDC");

  // We want to send 3 USDC to `0xrecipienteoa` on Ethereum Sepolia
  const intent: CurvyIntent =  {
    amount: 6.3,
    toAddress: "0xrecipienteoa",
    network,
    currency
  }

  // TODO: We need to think about whether algorithm has fees in mind,
  //  in other words will it calculate so that the recipient receives as close as possible to intent amount?
  //  or if it will overcharge any fees and the recipient will receive less than intended?
  //
  //  IN THIS EXAMPLE NO FEES EXIST!

  // this is filtered balancesForOneAssetAndOneNetwork, the filtering should be done by the algorithm
  // the simulation of the algorithm here is that since we want to send 6.3 USDC to EOA (but it needs to be aggregated because of multiple sources)
  // what the algorithm will choose to include is first all notes, then  all cscuc (now amounting to 3.32) and onboard one sa (3) to return 0.02 as change to the owner and 6.32 to the recipient
  // no SA
  const inputs = {
    "sa": [
      balances["sa"][1], // 3 USDC
    ],
    "csuc": [
      balances["csuc"][0], // 1 USDC
      balances["csuc"][1], // 2 USDC
    ],
    "note": [
      balances["note"][0] // 0.32 USDC
    ]
  }

  // After fetching all the inputs, the algorithm should then
  // create an execution plan
  // thought: this can give similar interface to bankr.bot

  cmd.setIntent(intent);
  const command = cmd.series(
    AgggregatorAggregate(
      cmd.parallel(
        AggregatorDeposit(
          OnboardToAggregator(
            OnboardToCSUC(
              SponsorGas(
                inputs["sa"]
              )
            )
          )
        ),
        AggregatorDeposit(
          OnboardToAggregator(inputs["csuc"][0])
        ),
        AggregatorDeposit(
          OnboardToAggregator(inputs["csuc"][1])
        )
      ),
      inputs["note"][0] // Aggregate with existing note
    )
  )

  await command.execute();
});
