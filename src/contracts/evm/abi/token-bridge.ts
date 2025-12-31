export const tokenBridgeAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "lifiDiamondAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "SafeERC20FailedOperation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "bridgeData",
        type: "bytes",
      },
    ],
    name: "bridgeAllTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;
