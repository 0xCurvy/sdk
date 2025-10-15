export const aggregatorABI = [
  {
    inputs: [
      {
        internalType: "address payable",
        name: "tokenWrapperAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "noteId",
        type: "uint256",
      },
    ],
    name: "DepositedNote",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "notesHash",
        type: "uint256",
      },
    ],
    name: "DepositedNotesHash",
    type: "event",
  },
  {
    inputs: [],
    name: "aggregationVerifier",
    outputs: [
      {
        internalType: "contract ICurvyAggregationVerifier",
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
        internalType: "uint256[2]",
        name: "proof_a",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2][2]",
        name: "proof_b",
        type: "uint256[2][2]",
      },
      {
        internalType: "uint256[2]",
        name: "proof_c",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[14]",
        name: "publicInputs",
        type: "uint256[14]",
      },
    ],
    name: "commitAggregationBatch",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[2]",
        name: "proof_a",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2][2]",
        name: "proof_b",
        type: "uint256[2][2]",
      },
      {
        internalType: "uint256[2]",
        name: "proof_c",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[4]",
        name: "publicInputs",
        type: "uint256[4]",
      },
    ],
    name: "commitDepositBatch",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[2]",
        name: "proof_a",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2][2]",
        name: "proof_b",
        type: "uint256[2][2]",
      },
      {
        internalType: "uint256[2]",
        name: "proof_c",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[10]",
        name: "publicInputs",
        type: "uint256[10]",
      },
    ],
    name: "commitWithdrawalBatch",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "fromAddress",
        type: "address",
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
        internalType: "struct CurvyAggregator_Types.Note",
        name: "note",
        type: "tuple",
      },
    ],
    name: "depositNote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeCollector",
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
    inputs: [],
    name: "insertionVerifier",
    outputs: [
      {
        internalType: "contract ICurvyInsertionVerifier",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "noteTree",
    outputs: [
      {
        internalType: "uint256",
        name: "_root",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nullifierTree",
    outputs: [
      {
        internalType: "uint256",
        name: "_root",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_operator",
        type: "address",
      },
      {
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "_ids",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "_amounts",
        type: "uint256[]",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "onERC1155BatchReceived",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_operator",
        type: "address",
      },
      {
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "onERC1155Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "operator",
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
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "pendingIdsQueue",
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
    name: "reset",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenWrapper",
    outputs: [
      {
        internalType: "contract MetaERC20Wrapper",
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
            internalType: "address",
            name: "insertionVerifier",
            type: "address",
          },
          {
            internalType: "address",
            name: "aggregationVerifier",
            type: "address",
          },
          {
            internalType: "address",
            name: "withdrawVerifier",
            type: "address",
          },
          {
            internalType: "address",
            name: "operator",
            type: "address",
          },
          {
            internalType: "address",
            name: "feeCollector",
            type: "address",
          },
        ],
        internalType: "struct CurvyAggregator_Types.ConfigurationUpdate",
        name: "_update",
        type: "tuple",
      },
    ],
    name: "updateConfig",
    outputs: [
      {
        internalType: "bool",
        name: "_success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawVerifier",
    outputs: [
      {
        internalType: "contract ICurvyWithdrawVerifier",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
