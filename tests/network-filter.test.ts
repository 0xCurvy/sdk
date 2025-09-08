import { expect, test } from "vitest";
import { Network } from "@/types";
import { NETWORK_FLAVOUR, NETWORK_GROUP } from "@/constants/networks";
import { filterNetworks } from "@/utils/network";

const fillerFields = {
  group: NETWORK_GROUP.ETHEREUM,
  slip0044: 0,
  flavour: NETWORK_FLAVOUR.EVM,
  multiCallContractAddress: "",
  nativeCurrency: "",
  chainId: "",
  blockExplorerUrl: "",
  rpcUrl: "",
  currencies: []
};

const networks: Network[] = [
  {
    id: 1,
    name: "Ethereum Sepolia",
    testnet: true,
    ...fillerFields
  },
  {
    id: 2,
    name: "Starknet Sepolia",
    testnet: true,
    ...fillerFields
  },
  {
    id: 3,
    name: "Ethereum",
    testnet: false,
    ...fillerFields
  }
];

test("should filter with slug format", () => {
  const successfulFilteredNetworks = filterNetworks(networks, "ethereum-sepolia");
  expect(successfulFilteredNetworks).toHaveLength(1);
  expect(successfulFilteredNetworks[0]).toEqual(networks[0]);

  const unsuccessfulFilteredNetworks = filterNetworks(networks, "");
  expect(unsuccessfulFilteredNetworks).toHaveLength(0);
});

test("should filter by id", () => {
  const successfulIdsForMessage=  ['"1"', "1", "1.0"];
  for (const [index, id] of ["1", 1, 1.0].entries()) {
    const filteredTestnets = filterNetworks(networks, id);
    expect(filteredTestnets, `${successfulIdsForMessage[index]} should have matched one network`).toHaveLength(1);
    expect(filteredTestnets[0].id, `${successfulIdsForMessage[index]} should have matched network with id 1`).toEqual(1);
  }

  const unsuccessfulIdsForMessage=  ['"100"', "100", "100.0"];
  for (const [index, id] of ["100", 100, 100.0].entries()) {
    const filteredTestnets = filterNetworks(networks, id);
    expect(filteredTestnets, `${unsuccessfulIdsForMessage[index]} should not match a network`).toHaveLength(0);
  }
});

test("should filter testnets and mainnets", () => {
  const filteredTestnets = filterNetworks(networks, true);
  expect(filteredTestnets).toHaveLength(2);
  expect(filteredTestnets[0]).toEqual(networks[0]);
  expect(filteredTestnets[1]).toEqual(networks[1]);

  const filteredMainnets = filterNetworks(networks, false);
  expect(filteredMainnets).toHaveLength(1);
  expect(filteredMainnets[0]).toEqual(networks[2]);
});


// TODO: Add test for filtering with array of numbers / strings and callback and undefined