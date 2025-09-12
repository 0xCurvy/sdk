export const aggregatorABI = [
  {
    type: "function",
    name: "UPGRADE_INTERFACE_VERSION",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "aggregationVerifier",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ICurvyAggregationVerifier",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "collectFees",
    inputs: [
      { name: "_tokens", type: "address[]", internalType: "address[]" },
      { name: "_to", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "csuc",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract ICSUC" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeCollector",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeCollectorBalancesDeprecated",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNoteInfo",
    inputs: [{ name: "_noteHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "_note",
        type: "tuple",
        internalType: "struct CurvyAggregator_Types.NoteWithMetaData",
        components: [
          {
            name: "note",
            type: "tuple",
            internalType: "struct CurvyAggregator_Types.Note",
            components: [
              {
                name: "ownerHash",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "token",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          { name: "sender", type: "address", internalType: "address" },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "included", type: "bool", internalType: "bool" },
          { name: "cancelled", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "insertionVerifier",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ICurvyInsertionVerifier",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "noteTree",
    inputs: [],
    outputs: [{ name: "_root", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nullifierTree",
    inputs: [],
    outputs: [{ name: "_root", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "operator",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "operatorExecute",
    inputs: [
      {
        name: "_data",
        type: "tuple",
        internalType: "struct CurvyAggregator_Types.ActionExecutionZKP",
        components: [
          { name: "a", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "b",
            type: "uint256[2][2]",
            internalType: "uint256[2][2]",
          },
          { name: "c", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "inputs",
            type: "uint256[46]",
            internalType: "uint256[46]",
          },
        ],
      },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "processWraps",
    inputs: [
      {
        name: "_data",
        type: "tuple",
        internalType: "struct CurvyAggregator_Types.WrappingZKP",
        components: [
          { name: "a", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "b",
            type: "uint256[2][2]",
            internalType: "uint256[2][2]",
          },
          { name: "c", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "inputs",
            type: "uint256[152]",
            internalType: "uint256[152]",
          },
        ],
      },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "reset",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unwrap",
    inputs: [
      {
        name: "_data",
        type: "tuple",
        internalType: "struct CurvyAggregator_Types.UnwrappingZKP",
        components: [
          { name: "a", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "b",
            type: "uint256[2][2]",
            internalType: "uint256[2][2]",
          },
          { name: "c", type: "uint256[2]", internalType: "uint256[2]" },
          {
            name: "inputs",
            type: "uint256[23]",
            internalType: "uint256[23]",
          },
        ],
      },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateConfig",
    inputs: [
      {
        name: "_update",
        type: "tuple",
        internalType: "struct CurvyAggregator_Types.ConfigurationUpdate",
        components: [
          {
            name: "insertionVerifier",
            type: "address",
            internalType: "address",
          },
          {
            name: "aggregationVerifier",
            type: "address",
            internalType: "address",
          },
          {
            name: "withdrawVerifier",
            type: "address",
            internalType: "address",
          },
          {
            name: "operator",
            type: "address",
            internalType: "address",
          },
          {
            name: "feeCollector",
            type: "address",
            internalType: "address",
          },
          {
            name: "withdrawBps",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "csuc", type: "address", internalType: "address" },
        ],
      },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address",
      },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdrawBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawRejected",
    inputs: [{ name: "_noteHash", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawVerifier",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ICurvyWithdrawVerifier",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "wrap",
    inputs: [
      {
        name: "_notes",
        type: "tuple[]",
        internalType: "struct CurvyAggregator_Types.Note[]",
        components: [
          {
            name: "ownerHash",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "token", type: "uint256", internalType: "uint256" },
          { name: "amount", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "_success", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "UnwrappingToken",
    inputs: [
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WrappingToken",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "ERC1967InvalidImplementation",
    inputs: [
      {
        name: "implementation",
        type: "address",
        internalType: "address",
      },
    ],
  },
  { type: "error", name: "ERC1967NonPayable", inputs: [] },
  { type: "error", name: "FailedCall", inputs: [] },
  { type: "error", name: "InvalidInitialization", inputs: [] },
  { type: "error", name: "NotInitializing", inputs: [] },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "ReentrancyGuardWithInitializerReentrantCall",
    inputs: [],
  },
  { type: "error", name: "UUPSUnauthorizedCallContext", inputs: [] },
  {
    type: "error",
    name: "UUPSUnsupportedProxiableUUID",
    inputs: [{ name: "slot", type: "bytes32", internalType: "bytes32" }],
  },
] as const;
