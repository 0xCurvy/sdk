export const legacyErc20PortalAbi = [
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
        name: "portalAddress",
        type: "address",
      },
    ],
    name: "shieldFullBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
