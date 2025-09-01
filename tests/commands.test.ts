import { test } from "vitest";
import { CurvySDK } from "@/sdk";
import { SendNativeCurrencyCommand } from "@/commands/send-native-currency";

test("should run a single command test", async () => {
  const sdk = await CurvySDK.init("thisisateststagingapikey", "ethgereum-sepolia", "http://api.curvy.dev");
  const cmd = sdk.commmander;

  cmd.series(
    cmd.command(SendNativeCurrencyCommand),
    cmd.parallel(

    ),
    cmd.series(

    )
  )
});
