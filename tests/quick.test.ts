import type { NETWORK_GROUP_VALUES } from "@/constants/networks";
import { CurvyEventEmitter } from "@/events";
import { CurvyCommand, type CurvyCommandEstimate } from "@/planner/commands/abstract";
import type { ICommandFactory } from "@/planner/commands/factory";
import { CommandExecutor } from "@/planner/executor";
import type { CurvyCommandData, CurvyIntent, CurvyPlan } from "@/planner/plan";

const plan: CurvyPlan = {
  type: "serial",
  items: [
    {
      type: "parallel",
      items: [
        {
          type: "serial",
          items: [
            {
              type: "data",
              data: {
                balance: 1n,
              } as never,
            },
          ],
        },
      ],
    },
    {
      type: "command",
      name: "aggregator-aggregate",
      intent: {
        toAddress: "vanja.local-curvy.name",
        amount: 20000000000000000000n,
        currency: {
          id: 4,
          name: "Ethereum",
          symbol: "ETH",
          price: "5000",
          updatedAt: "2025-09-12T09:44:16.064Z",
          iconUrl: "https://loremicon.com/lclr/64/64/21990103/png",
          coinmarketcapId: "1027",
          decimals: 18,
          contractAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          csucEnabled: true,
          nativeCurrency: true,
        },
        network: {
          id: 7,
          name: "Localnet",
          group: "Localnet" as NETWORK_GROUP_VALUES,
          testnet: false,
          slip0044: 90111,
          flavour: "evm",
          multiCallContractAddress: "0x59b670e9fa9d0a427751af201d676719a970857b",
          csucContractAddress: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
          aggregatorContractAddress: "0xa513e6e4b8f2a923d98304ec87f64353c4d5c853",
          chainId: "31337",
          blockExplorerUrl: "https://not-implemented.io/",
          rpcUrl: "http://localhost:4000/rpc/localnet",
          nativeCurrency: "false",
          currencies: [],
        },
      },
    },
  ],
};

class MockSuccessCommand extends CurvyCommand {
  constructor(input: CurvyCommandData) {
    const sdk = {
      walletManager: {
        activeWallet: {
          curvyHandle: "vitalik.curvy.name",
        },
      },
    };

    super(sdk as never, input);
  }

  async execute(): Promise<CurvyCommandData | undefined> {
    return this.input;
  }

  estimate(): Promise<CurvyCommandEstimate> {
    throw new Error("Method not implemented.");
  }
}

class MockCommandFactory implements ICommandFactory {
  createCommand(_name: string, input: CurvyCommandData, _intent?: CurvyIntent): CurvyCommand {
    return new MockSuccessCommand(input);
  }
}

test("should execute suboptimal case", async () => {
  const eventEmitter = new CurvyEventEmitter();
  const factory = new MockCommandFactory();

  const executor = new CommandExecutor(factory, eventEmitter);

  const result = await executor.executePlan(plan);

  expect(result.success, "should execute plan with mock commands correctly").toBe(true);
});
