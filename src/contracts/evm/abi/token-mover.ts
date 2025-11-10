export const tokenMoverAbi = [
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
        internalType: "address",
        name: "curvyVaultAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "gasSponsorshipAmount",
        type: "uint256",
      },
    ],
    name: "moveAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
