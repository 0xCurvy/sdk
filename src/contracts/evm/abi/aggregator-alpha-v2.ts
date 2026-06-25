export const aggregatorAlphaV2Abi = [
  {
    inputs: [],
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
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "AddressEmptyCode",
    type: "error",
  },
  {
    inputs: [],
    name: "AggregationVerifierNotConfigured",
    type: "error",
  },
  {
    inputs: [],
    name: "CurrentNoteTreeRootMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "CurrentNullifierTreeRootMismatch",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "implementation",
        type: "address",
      },
    ],
    name: "ERC1967InvalidImplementation",
    type: "error",
  },
  {
    inputs: [],
    name: "ERC1967NonPayable",
    type: "error",
  },
  {
    inputs: [],
    name: "FailedCall",
    type: "error",
  },
  {
    inputs: [],
    name: "FeeMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "FeeNotePublicKeyMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidGasFeeRoot",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidInitialization",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidInputHash",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidNotesRoot",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidProof",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidProtocolFee",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidWithdrawProof",
    type: "error",
  },
  {
    inputs: [],
    name: "NetAmountNonPositive",
    type: "error",
  },
  {
    inputs: [],
    name: "NotCurvyVault",
    type: "error",
  },
  {
    inputs: [],
    name: "NotInitializing",
    type: "error",
  },
  {
    inputs: [],
    name: "NoteAlreadyKnown",
    type: "error",
  },
  {
    inputs: [],
    name: "NoteIdsLengthMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "NoteNotScheduledForDeposit",
    type: "error",
  },
  {
    inputs: [],
    name: "NullifierAlreadyRegistered",
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
    name: "PendingNotesCommitmentVerifierNotConfigured",
    type: "error",
  },
  {
    inputs: [],
    name: "PortalNotRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "PublicSignalsLengthMismatch",
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
    inputs: [],
    name: "UUPSUnauthorizedCallContext",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "slot",
        type: "bytes32",
      },
    ],
    name: "UUPSUnsupportedProxiableUUID",
    type: "error",
  },
  {
    inputs: [],
    name: "UnderfundedReimbursement",
    type: "error",
  },
  {
    inputs: [],
    name: "UnknownGasFeeRoot",
    type: "error",
  },
  {
    inputs: [],
    name: "UnknownReferencedRoot",
    type: "error",
  },
  {
    inputs: [],
    name: "UnsupportedAggregationConfig",
    type: "error",
  },
  {
    inputs: [],
    name: "UnsupportedWithdrawalConfig",
    type: "error",
  },
  {
    inputs: [],
    name: "WithdrawalVerifierNotConfigured",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "root",
        type: "uint256",
      },
    ],
    name: "CommitmentGasFeeRootUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "batchIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "noteIds",
        type: "uint256[]",
      },
    ],
    name: "CommittedNotes",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "batchIndex",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "nullifiers",
        type: "uint256[]",
      },
    ],
    name: "CommittedNullifiers",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
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
        indexed: false,
        internalType: "uint256[]",
        name: "noteIds",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[][2]",
        name: "ephemeralKeys",
        type: "uint256[][2]",
      },
      {
        indexed: false,
        internalType: "uint16[]",
        name: "viewTags",
        type: "uint16[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "tokens",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
      {
        indexed: false,
        internalType: "bool[]",
        name: "isPlaintext",
        type: "bool[]",
      },
    ],
    name: "PendingNotes",
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
        name: "implementation",
        type: "address",
      },
    ],
    name: "Upgraded",
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
    name: "GAS_TREE_DEPTH",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
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
    inputs: [],
    name: "UPGRADE_INTERFACE_VERSION",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nullifier",
        type: "uint256",
      },
    ],
    name: "aggregationNullifiers",
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
        internalType: "bytes32",
        name: "configKey",
        type: "bytes32",
      },
    ],
    name: "aggregationVerifiersByConfig",
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
          {
            internalType: "uint256[2]",
            name: "ephemeralKey",
            type: "uint256[2]",
          },
          {
            internalType: "uint16",
            name: "viewTag",
            type: "uint16",
          },
        ],
        internalType: "struct CurvyTypes.Note",
        name: "note",
        type: "tuple",
      },
    ],
    name: "autoShield",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "batchSize",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
      {
        internalType: "uint256[]",
        name: "noteIds",
        type: "uint256[]",
      },
      {
        internalType: "uint256",
        name: "newNotesRoot",
        type: "uint256",
      },
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
    ],
    name: "commitPendingNotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "commitmentFeeRoot",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentNoteIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentNotesBatchIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentNotesTreeRoot",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentNullifiersBatchIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
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
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "feeNotePublicKey",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "maxOutputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
    ],
    name: "getAggregationVerifier",
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
    name: "getCurrentNoteIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentNotesBatchIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentNotesTreeRoot",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentNullifiersBatchIndex",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "batchSize",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
    ],
    name: "getPendingNotesCommitmentVerifier",
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
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
    ],
    name: "getWithdrawalVerifier",
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
    inputs: [
      {
        internalType: "address",
        name: "initialOwner",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "noteId",
        type: "uint256",
      },
    ],
    name: "noteStatus",
    outputs: [
      {
        internalType: "enum ICurvyAggregatorAlpha.NoteStatus",
        name: "",
        type: "uint8",
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
        internalType: "bytes32",
        name: "configKey",
        type: "bytes32",
      },
    ],
    name: "pendingNotesCommitmentVerifiersByConfig",
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
    name: "portalFactory",
    outputs: [
      {
        internalType: "contract IPortalFactory",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolFeePerThousand",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proxiableUUID",
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
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "maxOutputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifier",
        type: "address",
      },
    ],
    name: "setAggregationVerifier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "root",
        type: "uint256",
      },
    ],
    name: "setCommitmentGasFeeRoot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "x",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "y",
        type: "uint256",
      },
    ],
    name: "setFeeNotePublicKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "batchSize",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifier",
        type: "address",
      },
    ],
    name: "setPendingNotesCommitmentVerifier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_protocolFeePerThousand",
        type: "uint256",
      },
    ],
    name: "setProtocolFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "treeDepth",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifier",
        type: "address",
      },
    ],
    name: "setWithdrawalVerifier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
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
        internalType: "uint256[]",
        name: "publicSignals",
        type: "uint256[]",
      },
    ],
    name: "submitAggregationRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "maxInputs",
        type: "uint256",
      },
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
        internalType: "uint256[]",
        name: "publicSignals",
        type: "uint256[]",
      },
    ],
    name: "submitWithdrawalRequest",
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
        components: [
          {
            internalType: "address",
            name: "curvyVault",
            type: "address",
          },
          {
            internalType: "address",
            name: "portalFactory",
            type: "address",
          },
        ],
        internalType: "struct CurvyTypes.AggregatorConfigurationUpdate",
        name: "_update",
        type: "tuple",
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
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "root",
        type: "uint256",
      },
    ],
    name: "validNotesRoot",
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
        internalType: "uint256",
        name: "nullifier",
        type: "uint256",
      },
    ],
    name: "withdrawalNullifiers",
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
        internalType: "bytes32",
        name: "configKey",
        type: "bytes32",
      },
    ],
    name: "withdrawalVerifiersByConfig",
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
] as const;
