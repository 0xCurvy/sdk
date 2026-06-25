export const lifiDiamondFragmentAbi = [
  {
    name: "bridgeData",
    type: "tuple",
    components: [
      { name: "transactionId", type: "address" },
      { name: "bridge", type: "string" },
      { name: "integrator", type: "string" },
      { name: "referrer", type: "address" },
      { name: "sendingAssetId", type: "address" },
      { name: "receiver", type: "address" },
      { name: "minAmount", type: "uint256" },
      { name: "destinationChainId", type: "uint256" },
      { name: "hasSourceSwaps", type: "bool" },
      { name: "hasDestinationCall", type: "bool" },
    ],
  },
] as const;
