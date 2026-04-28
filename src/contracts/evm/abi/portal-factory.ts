export const portalFactoryAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "initialOwner",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "neededRole",
        type: "bytes32",
      },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "AmountMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "DeploymentFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidLiFiDestinationChain",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidLiFiReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "OwnableInvalidOwner",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error",
  },
  {
    inputs: [],
    name: "UnsupportedBridging",
    type: "error",
  },
  {
    inputs: [],
    name: "UnsupportedShielding",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "curvyVaultProxyAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "curvyAggregatorAlphaProxyAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "lifiDiamondAddress",
        type: "address",
      },
    ],
    name: "ConfigUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recovery",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "currency",
        type: "address",
      },
    ],
    name: "EntryBridgePortalDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "exitAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recovery",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "currency",
        type: "address",
      },
    ],
    name: "ExitBridgePortalDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "RecoveryPortalDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "ShieldPortalDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recovery",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "currency",
        type: "address",
      },
    ],
    name: "SolanaExitBridgePortalDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "to",
        type: "address",
      },
    ],
    name: "SolanaRecoveryPortalDeployed",
    type: "event",
  },
  {
    inputs: [],
    name: "AUTHORITY_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "OPERATOR_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "bridgeData",
        type: "bytes",
      },
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
        name: "currency",
        type: "address",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "deployEntryBridgePortal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
        name: "recovery",
        type: "address",
      },
    ],
    name: "deployExitBridgePortal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
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
    name: "deployRecoveryEntryPortal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
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
        name: "recovery",
        type: "address",
      },
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
    name: "deployRecoveryExitPortal",
    outputs: [],
    stateMutability: "nonpayable",
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
        name: "recovery",
        type: "address",
      },
    ],
    name: "deployShieldPortal",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
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
      {
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "deploySolanaExitBridgePortal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
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
    name: "deploySolanaRecoveryExitPortal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
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
        name: "recovery",
        type: "address",
      },
    ],
    name: "getCreationCode",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "ownerHash",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "getEntryPortalAddress",
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
        name: "recovery",
        type: "address",
      },
    ],
    name: "getExitPortalAddress",
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
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "getSolanaExitCreationCode",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "exitAddress",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "exitChainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "recovery",
        type: "address",
      },
    ],
    name: "getSolanaExitPortalAddress",
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
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
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
        internalType: "address",
        name: "portalAddress",
        type: "address",
      },
    ],
    name: "portalIsRegistered",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "curvyVaultProxyAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "curvyAggregatorAlphaProxyAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "lifiDiamondAddress",
        type: "address",
      },
    ],
    name: "updateConfig",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
