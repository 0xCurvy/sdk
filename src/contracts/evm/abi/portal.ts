export const portalAbi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "exitAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_recovery",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "BridgeCallFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientBalanceForLiFiBridging",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidLiFiAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidOwnerHash",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidOwnerHashOrExitBridgeData",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidRecoveryAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignatureOrTamperedData",
    type: "error",
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "reason",
        type: "string",
      },
    ],
    name: "ShieldingFailed",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "lifiDiamondAddress",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "bridgeData",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "currency",
        type: "address",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "curvyAggregator",
    outputs: [
      {
        internalType: "contract ICurvyAggregatorAlphaV2",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "curvyVault",
    outputs: [
      {
        internalType: "contract ICurvyVault",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
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
        name: "to",
        type: "address",
      },
    ],
    name: "recover",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "recovery",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "ownerHash",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct CurvyTypes.Note",
        name: "note",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "curvyAggregatorAlphaProxyAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "curvyVaultProxyAddress",
        type: "address",
      },
    ],
    name: "shield",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
