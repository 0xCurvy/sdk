export const ARTIFACT = {
  abi: [
    {
      type: "function",
      name: "UPGRADE_INTERFACE_VERSION",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "_hashActionPayload",
      inputs: [
        { name: "_from", type: "address", internalType: "address" },
        {
          name: "_payload",
          type: "tuple",
          internalType: "struct CSUC_Types.ActionPayload",
          components: [
            { name: "token", type: "address", internalType: "address" },
            { name: "actionId", type: "uint256", internalType: "uint256" },
            { name: "amount", type: "uint256", internalType: "uint256" },
            { name: "totalFee", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
            { name: "parameters", type: "bytes", internalType: "bytes" },
          ],
        },
      ],
      outputs: [{ name: "_hash", type: "bytes32", internalType: "bytes32" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "_hashActionPayloadWithCustomNonce",
      inputs: [
        {
          name: "_payload",
          type: "tuple",
          internalType: "struct CSUC_Types.ActionPayload",
          components: [
            { name: "token", type: "address", internalType: "address" },
            { name: "actionId", type: "uint256", internalType: "uint256" },
            { name: "amount", type: "uint256", internalType: "uint256" },
            { name: "totalFee", type: "uint256", internalType: "uint256" },
            { name: "limit", type: "uint256", internalType: "uint256" },
            { name: "parameters", type: "bytes", internalType: "bytes" },
          ],
        },
        { name: "_nonce", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "_hash", type: "bytes32", internalType: "bytes32" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "actionBecomesActiveAt",
      inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "actionInfo",
      inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      outputs: [
        { name: "mandatoryFeePoints", type: "uint16", internalType: "uint16" },
        { name: "handler", type: "address", internalType: "address" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "actionIsActive",
      inputs: [{ name: "_actionId", type: "uint256", internalType: "uint256" }],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "aggregator",
      inputs: [],
      outputs: [{ name: "", type: "address", internalType: "address" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "balanceAndNonce",
      inputs: [
        { name: "", type: "address", internalType: "address" },
        { name: "", type: "address", internalType: "address" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "balanceOf",
      inputs: [
        { name: "_owner", type: "address", internalType: "address" },
        { name: "_token", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "balanceOf",
      inputs: [
        { name: "_owner", type: "address", internalType: "address" },
        { name: "_token", type: "address", internalType: "address" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "balanceOfBatch",
      inputs: [
        { name: "accounts", type: "address[]", internalType: "address[]" },
        { name: "ids", type: "uint256[]", internalType: "uint256[]" },
      ],
      outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "batchCSAInfo",
      inputs: [
        { name: "_owners", type: "address[]", internalType: "address[]" },
        { name: "_tokens", type: "address[]", internalType: "address[]" },
      ],
      outputs: [
        {
          name: "_csaInfos",
          type: "tuple[]",
          internalType: "struct CSUC_Types.CSAInfo[]",
          components: [
            { name: "owner", type: "address", internalType: "address" },
            { name: "token", type: "address", internalType: "address" },
            { name: "balance", type: "uint256", internalType: "uint256" },
            { name: "nonce", type: "uint256", internalType: "uint256" },
          ],
        },
      ],
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
      name: "getActionHandlingInfo",
      inputs: [{ name: "_actionId", type: "uint256", internalType: "uint256" }],
      outputs: [
        {
          name: "",
          type: "tuple",
          internalType: "struct CSUC_Types.ActionHandlingInfo",
          components: [
            {
              name: "mandatoryFeePoints",
              type: "uint16",
              internalType: "uint16",
            },
            { name: "handler", type: "address", internalType: "address" },
          ],
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getMandatoryFee",
      inputs: [
        { name: "_actionId", type: "uint256", internalType: "uint256" },
        { name: "_amount", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
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
      name: "isApprovedForAll",
      inputs: [
        { name: "account", type: "address", internalType: "address" },
        { name: "operator", type: "address", internalType: "address" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "nonceOf",
      inputs: [
        { name: "_owner", type: "address", internalType: "address" },
        { name: "_token", type: "address", internalType: "address" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
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
          name: "_actions",
          type: "tuple[]",
          internalType: "struct CSUC_Types.Action[]",
          components: [
            { name: "from", type: "address", internalType: "address" },
            { name: "signature_v", type: "uint8", internalType: "uint8" },
            { name: "signature_r", type: "bytes32", internalType: "bytes32" },
            { name: "signature_s", type: "bytes32", internalType: "bytes32" },
            {
              name: "payload",
              type: "tuple",
              internalType: "struct CSUC_Types.ActionPayload",
              components: [
                { name: "token", type: "address", internalType: "address" },
                { name: "actionId", type: "uint256", internalType: "uint256" },
                { name: "amount", type: "uint256", internalType: "uint256" },
                { name: "totalFee", type: "uint256", internalType: "uint256" },
                { name: "limit", type: "uint256", internalType: "uint256" },
                { name: "parameters", type: "bytes", internalType: "bytes" },
              ],
            },
          ],
        },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
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
      name: "safeBatchTransferFrom",
      inputs: [
        { name: "_from", type: "address", internalType: "address" },
        { name: "_to", type: "address", internalType: "address" },
        { name: "_ids", type: "uint256[]", internalType: "uint256[]" },
        { name: "_values", type: "uint256[]", internalType: "uint256[]" },
        { name: "_data", type: "bytes", internalType: "bytes" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "safeTransferFrom",
      inputs: [
        { name: "_from", type: "address", internalType: "address" },
        { name: "_to", type: "address", internalType: "address" },
        { name: "_id", type: "uint256", internalType: "uint256" },
        { name: "_value", type: "uint256", internalType: "uint256" },
        { name: "", type: "bytes", internalType: "bytes" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "setApprovalForAll",
      inputs: [
        { name: "operator", type: "address", internalType: "address" },
        { name: "approved", type: "bool", internalType: "bool" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "supportsInterface",
      inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "view",
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
          name: "_action",
          type: "tuple",
          internalType: "struct CSUC_Types.Action",
          components: [
            { name: "from", type: "address", internalType: "address" },
            { name: "signature_v", type: "uint8", internalType: "uint8" },
            { name: "signature_r", type: "bytes32", internalType: "bytes32" },
            { name: "signature_s", type: "bytes32", internalType: "bytes32" },
            {
              name: "payload",
              type: "tuple",
              internalType: "struct CSUC_Types.ActionPayload",
              components: [
                { name: "token", type: "address", internalType: "address" },
                { name: "actionId", type: "uint256", internalType: "uint256" },
                { name: "amount", type: "uint256", internalType: "uint256" },
                { name: "totalFee", type: "uint256", internalType: "uint256" },
                { name: "limit", type: "uint256", internalType: "uint256" },
                { name: "parameters", type: "bytes", internalType: "bytes" },
              ],
            },
          ],
        },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "updateConfig",
      inputs: [
        {
          name: "_update",
          type: "tuple",
          internalType: "struct CSUC_Types.ConfigUpdate",
          components: [
            { name: "newOperator", type: "address", internalType: "address" },
            {
              name: "newFeeCollector",
              type: "address",
              internalType: "address",
            },
            { name: "newAggregator", type: "address", internalType: "address" },
            {
              name: "actionHandlingInfoUpdate",
              type: "tuple[]",
              internalType: "struct CSUC_Types.ActionHandlingInfoUpdate[]",
              components: [
                { name: "actionId", type: "uint256", internalType: "uint256" },
                {
                  name: "info",
                  type: "tuple",
                  internalType: "struct CSUC_Types.ActionHandlingInfo",
                  components: [
                    {
                      name: "mandatoryFeePoints",
                      type: "uint16",
                      internalType: "uint16",
                    },
                    {
                      name: "handler",
                      type: "address",
                      internalType: "address",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "upgradeToAndCall",
      inputs: [
        { name: "newImplementation", type: "address", internalType: "address" },
        { name: "data", type: "bytes", internalType: "bytes" },
      ],
      outputs: [],
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "uri",
      inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "wrap",
      inputs: [
        { name: "_to", type: "address", internalType: "address" },
        { name: "_token", type: "address", internalType: "address" },
        { name: "_amount", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "wrapERC20",
      inputs: [
        { name: "_to", type: "address", internalType: "address" },
        { name: "_token", type: "address", internalType: "address" },
        { name: "_amount", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "wrapNative",
      inputs: [{ name: "_to", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "payable",
    },
    {
      type: "event",
      name: "ActionExecuted",
      inputs: [
        {
          name: "action",
          type: "tuple",
          indexed: false,
          internalType: "struct CSUC_Types.Action",
          components: [
            { name: "from", type: "address", internalType: "address" },
            { name: "signature_v", type: "uint8", internalType: "uint8" },
            { name: "signature_r", type: "bytes32", internalType: "bytes32" },
            { name: "signature_s", type: "bytes32", internalType: "bytes32" },
            {
              name: "payload",
              type: "tuple",
              internalType: "struct CSUC_Types.ActionPayload",
              components: [
                { name: "token", type: "address", internalType: "address" },
                { name: "actionId", type: "uint256", internalType: "uint256" },
                { name: "amount", type: "uint256", internalType: "uint256" },
                { name: "totalFee", type: "uint256", internalType: "uint256" },
                { name: "limit", type: "uint256", internalType: "uint256" },
                { name: "parameters", type: "bytes", internalType: "bytes" },
              ],
            },
          ],
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "ApprovalForAll",
      inputs: [
        {
          name: "account",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "operator",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "approved",
          type: "bool",
          indexed: false,
          internalType: "bool",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "ConfigUpdated",
      inputs: [
        {
          name: "update",
          type: "tuple",
          indexed: false,
          internalType: "struct CSUC_Types.ConfigUpdate",
          components: [
            { name: "newOperator", type: "address", internalType: "address" },
            {
              name: "newFeeCollector",
              type: "address",
              internalType: "address",
            },
            { name: "newAggregator", type: "address", internalType: "address" },
            {
              name: "actionHandlingInfoUpdate",
              type: "tuple[]",
              internalType: "struct CSUC_Types.ActionHandlingInfoUpdate[]",
              components: [
                { name: "actionId", type: "uint256", internalType: "uint256" },
                {
                  name: "info",
                  type: "tuple",
                  internalType: "struct CSUC_Types.ActionHandlingInfo",
                  components: [
                    {
                      name: "mandatoryFeePoints",
                      type: "uint16",
                      internalType: "uint16",
                    },
                    {
                      name: "handler",
                      type: "address",
                      internalType: "address",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      anonymous: false,
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
      name: "TransferBatch",
      inputs: [
        {
          name: "operator",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "from",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        { name: "to", type: "address", indexed: true, internalType: "address" },
        {
          name: "ids",
          type: "uint256[]",
          indexed: false,
          internalType: "uint256[]",
        },
        {
          name: "values",
          type: "uint256[]",
          indexed: false,
          internalType: "uint256[]",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "TransferSingle",
      inputs: [
        {
          name: "operator",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "from",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        { name: "to", type: "address", indexed: true, internalType: "address" },
        {
          name: "id",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
        {
          name: "value",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "URI",
      inputs: [
        {
          name: "value",
          type: "string",
          indexed: false,
          internalType: "string",
        },
        { name: "id", type: "uint256", indexed: true, internalType: "uint256" },
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
      type: "error",
      name: "AddressEmptyCode",
      inputs: [{ name: "target", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC1155InsufficientBalance",
      inputs: [
        { name: "sender", type: "address", internalType: "address" },
        { name: "balance", type: "uint256", internalType: "uint256" },
        { name: "needed", type: "uint256", internalType: "uint256" },
        { name: "tokenId", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "ERC1155InvalidApprover",
      inputs: [{ name: "approver", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC1155InvalidArrayLength",
      inputs: [
        { name: "idsLength", type: "uint256", internalType: "uint256" },
        { name: "valuesLength", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "ERC1155InvalidOperator",
      inputs: [{ name: "operator", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC1155InvalidReceiver",
      inputs: [{ name: "receiver", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC1155InvalidSender",
      inputs: [{ name: "sender", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC1155MissingApprovalForAll",
      inputs: [
        { name: "operator", type: "address", internalType: "address" },
        { name: "owner", type: "address", internalType: "address" },
      ],
    },
    {
      type: "error",
      name: "ERC1967InvalidImplementation",
      inputs: [{ name: "implementation", type: "address", internalType: "address" }],
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
    { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
    {
      type: "error",
      name: "SafeERC20FailedOperation",
      inputs: [{ name: "token", type: "address", internalType: "address" }],
    },
    { type: "error", name: "UUPSUnauthorizedCallContext", inputs: [] },
    {
      type: "error",
      name: "UUPSUnsupportedProxiableUUID",
      inputs: [{ name: "slot", type: "bytes32", internalType: "bytes32" }],
    },
  ],
  bytecode: {
    object:
      "0x60a0604052306080523480156012575f5ffd5b5060015f5560805161404361003d5f395f81816128160152818161283f015261298301526140435ff3fe6080604052600436106101fb575f3560e01c806365df7ed911610113578063b726d8821161009d578063e985e9c51161006d578063e985e9c5146106b6578063efd61e60146106d5578063f242432a146106f4578063f2fde38b14610713578063f7888aec14610732575f5ffd5b8063b726d882146105e7578063c415b95c14610606578063c91db84314610625578063e3a4865f14610644575f5ffd5b80638129fc1c116100e35780638129fc1c146105295780638da5cb5b1461053d578063a22cb46514610579578063aba4ef1a14610598578063ad3cb1cc146105b7575f5ffd5b806365df7ed9146104a9578063715018a6146104c857806379d7ca52146104dc5780637aab69101461050a575f5ffd5b80632eb2c2d61161019457806352d1902d1161016457806352d1902d14610419578063570ca7351461042d5780635d85a3a11461044c578063623556381461046b57806363b5a5c01461047e575f5ffd5b80632eb2c2d61461038d5780633cb86b7a146103ae5780634e1273f4146103da5780634f1ef28614610406575f5ffd5b8063137db525116101cf578063137db525146102c2578063245a7bfc146103245780632479d8631461035b5780632860cfdf1461036e575f5ffd5b8062fdd58e146101ff57806301ffc9a71461023157806303f95bf1146102605780630e89341c14610296575b5f5ffd5b34801561020a575f5ffd5b5061021e610219366004613104565b610751565b6040519081526020015b60405180910390f35b34801561023c575f5ffd5b5061025061024b36600461312e565b610765565b6040519015158152602001610228565b34801561026b575f5ffd5b5061021e61027a366004613155565b600460209081525f928352604080842090915290825290205481565b3480156102a1575f5ffd5b506102b56102b036600461318c565b6107b4565b60405161022891906131d1565b3480156102cd575f5ffd5b506103026102dc36600461318c565b60056020525f908152604090205461ffff8116906201000090046001600160a01b031682565b6040805161ffff90931683526001600160a01b03909116602083015201610228565b34801561032f575f5ffd5b50600354610343906001600160a01b031681565b6040516001600160a01b039091168152602001610228565b6102506103693660046131e3565b610889565b348015610379575f5ffd5b5061025061038836600461343d565b61098d565b348015610398575f5ffd5b506103ac6103a7366004613502565b610bbe565b005b3480156103b9575f5ffd5b506103cd6103c8366004613616565b610d1e565b6040516102289190613679565b3480156103e5575f5ffd5b506103f96103f43660046136ec565b610eaa565b604051610228919061377f565b6103ac610414366004613791565b610f74565b348015610424575f5ffd5b5061021e610f93565b348015610438575f5ffd5b50600254610343906001600160a01b031681565b348015610457575f5ffd5b506102506104663660046137d3565b610fae565b6102506104793660046137d3565b6111c7565b348015610489575f5ffd5b5061021e61049836600461318c565b60066020525f908152604090205481565b3480156104b4575f5ffd5b506102506104c3366004613811565b61129b565b3480156104d3575f5ffd5b506103ac611420565b3480156104e7575f5ffd5b506102506104f636600461318c565b5f9081526006602052604090205443101590565b348015610515575f5ffd5b5061021e61052436600461397a565b611433565b348015610534575f5ffd5b506103ac61149e565b348015610548575f5ffd5b507f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b0316610343565b348015610584575f5ffd5b506103ac6105933660046139c9565b6115d3565b3480156105a3575f5ffd5b5061021e6105b23660046139f5565b6115de565b3480156105c2575f5ffd5b506102b5604051806040016040528060058152602001640352e302e360dc1b81525081565b3480156105f2575f5ffd5b5061021e610601366004613a15565b611617565b348015610611575f5ffd5b50600154610343906001600160a01b031681565b348015610630575f5ffd5b5061021e61063f366004613a56565b61164b565b34801561064f575f5ffd5b506106a961065e36600461318c565b604080518082019091525f8082526020820152505f9081526005602090815260409182902082518084019093525461ffff811683526201000090046001600160a01b03169082015290565b6040516102289190613b05565b3480156106c1575f5ffd5b506102506106d0366004613155565b611e31565b3480156106e0575f5ffd5b5061021e6106ef366004613155565b611e7d565b3480156106ff575f5ffd5b506103ac61070e366004613b29565b611eb8565b34801561071e575f5ffd5b506103ac61072d3660046131e3565b612103565b34801561073d575f5ffd5b5061021e61074c366004613155565b612140565b5f61075c8383612140565b90505b92915050565b5f6001600160e01b03198216636cdb3d1360e11b148061079557506001600160e01b031982166303a24d0760e21b145b8061075f57506301ffc9a760e01b6001600160e01b031983161461075f565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c450280546060917f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45009161080590613b80565b80601f016020809104026020016040519081016040528092919081815260200182805461083190613b80565b801561087c5780601f106108535761010080835404028352916020019161087c565b820191905f5260205f20905b81548152906001019060200180831161085f57829003601f168201915b5050505050915050919050565b5f345f036108b25760405162461bcd60e51b81526004016108a990613bb8565b60405180910390fd5b6001600160a01b0382165f9081527fabd6e7cb50984ff9c2f3e18a2660c3353dadf4e3291deeb275dae2cd1e44fe05602052604081205481906108f49061217b565b909250905061090c6109063484613c0f565b826121ae565b6001600160a01b0385165f9081527fabd6e7cb50984ff9c2f3e18a2660c3353dadf4e3291deeb275dae2cd1e44fe0560205260409081902091909155517f047711c4c8e7e4ce61a7632dc5a0f1f17f36835d34ef5f2f1859628dd5db88a79061097b9086906001903490613c22565b60405180910390a15060019392505050565b5f61099661235e565b6040516020016109d39060208082526019908201527810d4d550d7d5d2551211149055d05317d050d51253d397d251603a1b604082015260600190565b604051602081830303815290604052805190602001205f1c82608001516020015114610a3a5760405162461bcd60e51b8152602060048201526016602482015275435355433a2077726f6e6720616374696f6e2069642160501b60448201526064016108a9565b610a4382612386565b610a9b5760405162461bcd60e51b815260206004820152602360248201527f435355433a207769746864726177616c20616374696f6e20697320696e76616c60448201526269642160e81b60648201526084016108a9565b610aa4826124c5565b610ac05760405162461bcd60e51b81526004016108a990613c46565b6080820151516001600160a01b039081165f90815260046020908152604080832086519094168352929052908120548190610afa9061217b565b91509150610b15846080015160600151836109069190613c0f565b608085018051516001600160a01b039081165f908152600460209081526040808320600154909416835292815291812093909355905160a001518051610b619290820181019101613c8a565b6080860151805160409182015191519293507f1bbee009b0b564574ffaa8fb78789b54236b986ed71913a080600f359b0f4df692610ba192859291613c22565b60405180910390a160019350505050610bb960015f55565b919050565b8151835114610c1d5760405162461bcd60e51b815260206004820152602560248201527f435355433a2069647320616e642076616c756573206c656e677468206d69736d604482015264617463682160d81b60648201526084016108a9565b82515f03610c6d5760405162461bcd60e51b815260206004820152601d60248201527f435355433a206172726179732063616e6e6f7420626520656d7074792100000060448201526064016108a9565b5f5b8351811015610cbf57610cb78686868481518110610c8f57610c8f613ca5565b6020026020010151868581518110610ca957610ca9613ca5565b602002602001015186611eb8565b600101610c6f565b50836001600160a01b0316856001600160a01b0316336001600160a01b03167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb8686604051610d0f929190613cb9565b60405180910390a45050505050565b606081518351610d2e9190613cdd565b6001600160401b03811115610d4557610d456131fe565b604051908082528060200260200182016040528015610d9557816020015b604080516080810182525f8082526020808301829052928201819052606082015282525f19909201910181610d635790505b5090505f5b8351811015610ea3576040518060800160405280858381518110610dc057610dc0613ca5565b60200260200101516001600160a01b03168152602001848381518110610de857610de8613ca5565b60200260200101516001600160a01b03168152602001610e3a868481518110610e1357610e13613ca5565b6020026020010151868581518110610e2d57610e2d613ca5565b6020026020010151612140565b8152602001610e7b868481518110610e5457610e54613ca5565b6020026020010151868581518110610e6e57610e6e613ca5565b6020026020010151611e7d565b815250828281518110610e9057610e90613ca5565b6020908102919091010152600101610d9a565b5092915050565b60608151835114610edb5781518351604051635b05999160e01b8152600481019290925260248201526044016108a9565b5f83516001600160401b03811115610ef557610ef56131fe565b604051908082528060200260200182016040528015610f1e578160200160208202803683370190505b5090505f5b8451811015610f6c57602080820286010151610f4790602080840287010151610751565b828281518110610f5957610f59613ca5565b6020908102919091010152600101610f23565b509392505050565b610f7c61280b565b610f85826128af565b610f8f82826128b7565b5050565b5f610f9c612978565b505f5160206140235f395f51905f5290565b5f815f03610fce5760405162461bcd60e51b81526004016108a990613bb8565b6040516370a0823160e01b81523060048201525f906001600160a01b038516906370a0823190602401602060405180830381865afa158015611012573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110369190613cf4565b905061104d6001600160a01b0385163330866129c1565b6040516370a0823160e01b81523060048201525f906001600160a01b038616906370a0823190602401602060405180830381865afa158015611091573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110b59190613cf4565b9050836110c28383613d0b565b1461110f5760405162461bcd60e51b815260206004820152601c60248201527f435355433a204552433230207472616e73666572206661696c6564210000000060448201526064016108a9565b6001600160a01b038086165f908152600460209081526040808320938a1683529290529081205481906111419061217b565b90925090506111536109068784613c0f565b6001600160a01b038089165f908152600460209081526040808320938d16835292905281902091909155517f047711c4c8e7e4ce61a7632dc5a0f1f17f36835d34ef5f2f1859628dd5db88a7906111af908a908a908a90613c22565b60405180910390a160019450505050505b9392505050565b5f341561122f576111d784610889565b61122f5760405162461bcd60e51b815260206004820152602360248201527f435355433a206e617469766520746f6b656e207772617070696e67206661696c60448201526265642160e81b60648201526084016108a9565b61123a848484610fae565b6112915760405162461bcd60e51b815260206004820152602260248201527f435355433a20455243323020746f6b656e207772617070696e67206661696c65604482015261642160f01b60648201526084016108a9565b5060019392505050565b5f6112a4612a21565b81516001600160a01b0316156112d6578151600280546001600160a01b0319166001600160a01b039092169190911790555b60208201516001600160a01b03161561130e576020820151600180546001600160a01b0319166001600160a01b039092169190911790555b60408201516001600160a01b031615611346576040820151600380546001600160a01b0319166001600160a01b039092169190911790555b5f5b8260600151518110156113e0575f8360600151828151811061136c5761136c613ca5565b6020908102919091018101518082015181515f90815260058452604090208151815492909401516001600160a01b031662010000026001600160b01b031990921661ffff909416939093171790915590506113c8600143613c0f565b90515f90815260066020526040902055600101611348565b507f09625a48c17c53b2ebcdec381272eac2dc81b298e12f2a293643b55f19009612826040516114109190613d1e565b60405180910390a1506001919050565b611428612a21565b6114315f612a7c565b565b80516001600160a01b039081165f90815260046020908152604080832093861683529290529081205481906114679061217b565b91505046838260405160200161147f93929190613e04565b6040516020818303038152906040528051906020012091505092915050565b5f6114a7612aec565b805490915060ff600160401b82041615906001600160401b03165f811580156114cd5750825b90505f826001600160401b031660011480156114e85750303b155b9050811580156114f6575080155b156115145760405163f92ee8a960e01b815260040160405180910390fd5b845467ffffffffffffffff19166001178555831561153e57845460ff60401b1916600160401b1785555b61154733612b14565b61154f612b25565b6115866040518060400160405280601681526020017568747470733a2f2f63757276792e626f782f6373756360501b815250612b2d565b83156115cc57845460ff60401b19168555604051600181527fc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d29060200160405180910390a15b5050505050565b610f8f338383612b3e565b5f828152600560205260408120546402540be4009061160290849061ffff16613cdd565b61160c9190613e2c565b61075c906001613c0f565b5f46838360405160200161162d93929190613e04565b60405160208183030381529060405280519060200120905092915050565b6002545f906001600160a01b031633146116ba5760405162461bcd60e51b815260206004820152602a60248201527f435355433a206f6e6c79206f70657261746f722063616e206578656375746520604482015269746869732063616c6c2160b01b60648201526084016108a9565b6116c261235e565b5f8080805b8551811015611e24578581815181106116e2576116e2613ca5565b6020026020010151608001515f0151925085818151811061170557611705613ca5565b60200260200101516080015160600151826117209190613c0f565b9150600186516117309190613d0b565b8114806117ac57506040516020016117709060208082526014908201527310d4d550d7d0d311505497d050d51253d397d25160621b604082015260600190565b604051602081830303815290604052805190602001205f1c86828151811061179a5761179a613ca5565b60200260200101516080015160200151145b15611866576001600160a01b038084165f90815260046020908152604080832060015490941683529290529081205481906117e69061217b565b90925090506117f86109068584613c0f565b6001600160a01b038087165f90815260046020908152604080832060015490941683529290522055875188908490811061183457611834613ca5565b6020026020010151608001515f015194505f9350600188516118569190613d0b565b8314611863575050611e1c565b50505b61188886828151811061187b5761187b613ca5565b6020026020010151612386565b1515600103611e1c576040516020016118cc9060208082526017908201527610d4d550d7d514905394d1915497d050d51253d397d251604a1b604082015260600190565b604051602081830303815290604052805190602001205f1c8682815181106118f6576118f6613ca5565b60200260200101516080015160200151036119895761192d86828151811061192057611920613ca5565b6020026020010151612bf6565b6119845760405162461bcd60e51b815260206004820152602260248201527f435355433a20636f726520616374696f6e207472616e73666572206661696c65604482015261642160f01b60648201526084016108a9565b611dc0565b6040516020016119c69060208082526019908201527810d4d550d7d5d2551211149055d05317d050d51253d397d251603a1b604082015260600190565b604051602081830303815290604052805190602001205f1c8682815181106119f0576119f0613ca5565b6020026020010151608001516020015103611a4357611a27868281518110611a1a57611a1a613ca5565b60200260200101516124c5565b6119845760405162461bcd60e51b81526004016108a990613c46565b611a7c868281518110611a5857611a58613ca5565b602002602001015160800151602001515f9081526006602052604090205443101590565b15611e1c575f60055f888481518110611a9757611a97613ca5565b6020908102919091018101516080015181015182528101919091526040015f20546201000090046001600160a01b0316905080611b165760405162461bcd60e51b815260206004820152601d60248201527f435355433a20616374696f6e2068616e646c6572206e6f74207365742100000060448201526064016108a9565b6001600160a01b0384165f9081526004602052604081208851611b78919083908b9087908110611b4857611b48613ca5565b60200260200101515f01516001600160a01b03166001600160a01b031681526020019081526020015f205461217b565b9150505f5f836001600160a01b03166391c0cda460e01b8b8781518110611ba157611ba1613ca5565b6020026020010151604051602401611bb99190613e4b565b60408051601f198184030181529181526020820180516001600160e01b03166001600160e01b0319909416939093179092529051611bf79190613e98565b5f60405180830381855af49150503d805f8114611c2f576040519150601f19603f3d011682016040523d82523d5f602084013e611c34565b606091505b509150915081611c975760405162461bcd60e51b815260206004820152602860248201527f435355433a20637573746f6d20616374696f6e2068616e646c65722063616c6c604482015267206661696c65642160c01b60648201526084016108a9565b5f81806020019051810190611cac9190613eae565b905080611d0f5760405162461bcd60e51b815260206004820152602b60248201527f435355433a20637573746f6d20616374696f6e2068616e646c6572207265747560448201526a726e65642066616c73652160a81b60648201526084016108a9565b6001600160a01b0388165f9081526004602052604081208c51611d41919083908f908b908110611b4857611b48613ca5565b9150611d509050856001613c0f565b8114611db95760405162461bcd60e51b815260206004820152603260248201527f435355433a20637573746f6d20616374696f6e2068616e646c6572206e6f6e6360448201527165206e6f7420696e6372656d656e7465642160701b60648201526084016108a9565b5050505050505b611dc984613ec9565b93507f10e88280d3da28fd02bac1a8f23ffdec17105b9276c74971e481dc8bb81399b2868281518110611dfe57611dfe613ca5565b6020026020010151604051611e139190613e4b565b60405180910390a15b6001016116c7565b505060015f555092915050565b6001600160a01b039182165f9081527f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45016020908152604080832093909416825291909152205460ff1690565b6001600160a01b038082165f9081526004602090815260408083209386168352929052908120548190611eaf9061217b565b95945050505050565b611ec28533611e31565b80611ed55750336001600160a01b038616145b611f215760405162461bcd60e51b815260206004820152601d60248201527f435355433a2063616c6c6572206973206e6f7420617070726f7665642100000060448201526064016108a9565b5f8390505f611f82604051602001611f649060208082526017908201527610d4d550d7d514905394d1915497d050d51253d397d251604a1b604082015260600190565b604051602081830303815290604052805190602001205f1c856115de565b90505f611f8f8286613c0f565b9050611f9c838983612d55565b6001600160a01b038084165f908152600460209081526040808320938c168352929052908120548190611fce9061217b565b9092509050611ff0611fe08484613d0b565b611feb836001613c0f565b6121ae565b6001600160a01b038681165f9081526004602090815260408083208f8516845290915280822093909355908b168152205461202a9061217b565b909250905061203c6109068884613c0f565b6001600160a01b038681165f9081526004602090815260408083208e8516845290915280822093909355600154909116815220546120799061217b565b909250905061208b6109068584613c0f565b6001600160a01b038681165f908152600460209081526040808320600154851684528252918290209390935580518b81529283018a90528b821692918d169133917fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62910160405180910390a450505050505050505050565b61210b612a21565b6001600160a01b03811661213457604051631e4fbdf760e01b81525f60048201526024016108a9565b61213d81612a7c565b50565b6001600160a01b038082165f90815260046020908152604080832093861683529290529081205481906121729061217b565b50949350505050565b5f8061218c6001600160c81b613d0b565b603784901c166121a460016680000000000000613d0b565b9094931692915050565b5f6121be6001600160c81b613d0b565b8311156122175760405162461bcd60e51b815260206004820152602160248201527f435355433a2062616c616e636520697320746f6f2062696720746f207061636b6044820152602160f81b60648201526084016108a9565b6001612224816037613d0b565b6001901b6122329190613d0b565b8211156122815760405162461bcd60e51b815260206004820152601f60248201527f435355433a206e6f6e636520697320746f6f2062696720746f207061636b210060448201526064016108a9565b50603782901b81175f806122948361217b565b915091508482146122f85760405162461bcd60e51b815260206004820152602860248201527f435355433a20636865636b696e672062616c616e636520756e7061636b696e67604482015267206661696c65642160c01b60648201526084016108a9565b8381146123565760405162461bcd60e51b815260206004820152602660248201527f435355433a20636865636b696e67206e6f6e636520756e7061636b696e67206660448201526561696c65642160d01b60648201526084016108a9565b505092915050565b60025f540361238057604051633ee5aeb560e01b815260040160405180910390fd5b60025f55565b5f5f600161239b845f01518560800151611433565b8460200151856040015186606001516040515f81526020016040526040516123df949392919093845260ff9290921660208401526040830152606082015260800190565b6020604051602081039080840390855afa1580156123ff573d5f5f3e3d5ffd5b5050604051601f19015184519092506001600160a01b0380841691161490508061243b5760405162461bcd60e51b81526004016108a990613ee1565b6080808501510151431115816124635760405162461bcd60e51b81526004016108a990613ee1565b5f61247e8660800151602001518760800151604001516115de565b86608001516060015110159050826124a85760405162461bcd60e51b81526004016108a990613ee1565b8280156124b25750815b80156124bb5750805b9695505050505050565b5f5f8260800151604001518360800151606001516124e39190613c0f565b60808401515184519192506124f89183612d55565b6080830151516001600160a01b039081165f908152600460209081526040808320875190941683529290529081205481906125329061217b565b9092509050612544611fe08484613d0b565b608086018051516001600160a01b039081165f9081526004602090815260408083208b51909416835292815291812093909355905160a00151805161258f9290820181019101613c8a565b90505f5f60016001600160a01b031688608001515f01516001600160a01b03160361267c57608088015160409081015190516001600160a01b0385168031945091905f81818185875af1925050503d805f8114612607576040519150601f19603f3d011682016040523d82523d5f602084013e61260c565b606091505b5050809750508661266b5760405162461bcd60e51b815260206004820152602360248201527f435355433a206e617469766520746f6b656e207472616e73666572206661696c60448201526265642160e81b60648201526084016108a9565b506001600160a01b03821631612781565b6080880151516040516370a0823160e01b81526001600160a01b038581166004830152909116906370a0823190602401602060405180830381865afa1580156126c7573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906126eb9190613cf4565b60808901516040810151905191935061270f916001600160a01b0316908590612deb565b6080880151516040516370a0823160e01b81526001600160a01b038581166004830152909116906370a0823190602401602060405180830381865afa15801561275a573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061277e9190613cf4565b90505b81886080015160400151826127969190613d0b565b149650866127fd5760405162461bcd60e51b815260206004820152602e60248201527f435355433a207769746864726177616c206661696c6564202d20616d6f756e7460448201526d7320646f6e2774206d617463682160901b60648201526084016108a9565b506001979650505050505050565b306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016148061289157507f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03166128855f5160206140235f395f51905f52546001600160a01b031690565b6001600160a01b031614155b156114315760405163703e46dd60e11b815260040160405180910390fd5b61213d612a21565b816001600160a01b03166352d1902d6040518163ffffffff1660e01b8152600401602060405180830381865afa925050508015612911575060408051601f3d908101601f1916820190925261290e91810190613cf4565b60015b61293957604051634c9c8ce360e01b81526001600160a01b03831660048201526024016108a9565b5f5160206140235f395f51905f52811461296957604051632a87526960e21b8152600481018290526024016108a9565b6129738383612e1c565b505050565b306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146114315760405163703e46dd60e11b815260040160405180910390fd5b612a1b84856001600160a01b03166323b872dd8686866040516024016129e993929190613c22565b604051602081830303815290604052915060e01b6020820180516001600160e01b038381831617835250505050612e71565b50505050565b33612a537f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b031690565b6001600160a01b0316146114315760405163118cdaa760e01b81523360048201526024016108a9565b7f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c19930080546001600160a01b031981166001600160a01b03848116918217845560405192169182907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a3505050565b5f807ff0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a0061075f565b612b1c612edd565b61213d81612f02565b611431612edd565b612b35612edd565b61213d81612f0a565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45006001600160a01b038316612b875760405162ced3e160e81b81525f60048201526024016108a9565b6001600160a01b038481165f818152600184016020908152604080832094881680845294825291829020805460ff191687151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a350505050565b5f5f826080015160400151836080015160600151612c149190613c0f565b6080840151518451919250612c299183612d55565b6080830151516001600160a01b039081165f90815260046020908152604080832087519094168352929052908120548190612c639061217b565b9092509050612c75611fe08484613d0b565b608086018051516001600160a01b039081165f9081526004602090815260408083208b51909416835292815291812093909355905160a001518051612cc09290820181019101613c8a565b6080870151516001600160a01b039081165f90815260046020908152604080832093851683529290522054909150612cf79061217b565b6080880151604001519194509250612d1990612d139085613c0f565b836121ae565b608090960151516001600160a01b039081165f908152600460209081526040808320949093168252929092529020949094555060019392505050565b6001600160a01b038084165f908152600460209081526040808320938616835292905290812054612d859061217b565b50905081811015612a1b5760405162461bcd60e51b815260206004820152602a60248201527f435355433a2062616c616e6365206973206e6f7420656e6f75676820746f20636044820152696f76657220636f73742160b01b60648201526084016108a9565b6040516001600160a01b0383811660248301526044820183905261297391859182169063a9059cbb906064016129e9565b612e2582612f1b565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b905f90a2805115612e69576129738282612f7e565b610f8f612fe7565b5f5f60205f8451602086015f885af180612e90576040513d5f823e3d81fd5b50505f513d91508115612ea7578060011415612eb4565b6001600160a01b0384163b155b15612a1b57604051635274afe760e01b81526001600160a01b03851660048201526024016108a9565b612ee5613006565b61143157604051631afcd79f60e31b815260040160405180910390fd5b61210b612edd565b612f12612edd565b61213d8161301f565b806001600160a01b03163b5f03612f5057604051634c9c8ce360e01b81526001600160a01b03821660048201526024016108a9565b5f5160206140235f395f51905f5280546001600160a01b0319166001600160a01b0392909216919091179055565b60605f5f846001600160a01b031684604051612f9a9190613e98565b5f60405180830381855af49150503d805f8114612fd2576040519150601f19603f3d011682016040523d82523d5f602084013e612fd7565b606091505b5091509150611eaf85838361306b565b34156114315760405163b398979f60e01b815260040160405180910390fd5b5f61300f612aec565b54600160401b900460ff16919050565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45007f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45026129738382613f68565b6060826130805761307b826130c7565b6111c0565b815115801561309757506001600160a01b0384163b155b156130c057604051639996b31560e01b81526001600160a01b03851660048201526024016108a9565b50806111c0565b8051156130d75780518082602001fd5b60405163d6bda27560e01b815260040160405180910390fd5b6001600160a01b038116811461213d575f5ffd5b5f5f60408385031215613115575f5ffd5b8235613120816130f0565b946020939093013593505050565b5f6020828403121561313e575f5ffd5b81356001600160e01b0319811681146111c0575f5ffd5b5f5f60408385031215613166575f5ffd5b8235613171816130f0565b91506020830135613181816130f0565b809150509250929050565b5f6020828403121561319c575f5ffd5b5035919050565b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b602081525f61075c60208301846131a3565b5f602082840312156131f3575f5ffd5b81356111c0816130f0565b634e487b7160e01b5f52604160045260245ffd5b60405160c081016001600160401b0381118282101715613234576132346131fe565b60405290565b60405160a081016001600160401b0381118282101715613234576132346131fe565b604051608081016001600160401b0381118282101715613234576132346131fe565b604080519081016001600160401b0381118282101715613234576132346131fe565b604051601f8201601f191681016001600160401b03811182821017156132c8576132c86131fe565b604052919050565b5f82601f8301126132df575f5ffd5b81356001600160401b038111156132f8576132f86131fe565b61330b601f8201601f19166020016132a0565b81815284602083860101111561331f575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f60c0828403121561334b575f5ffd5b613353613212565b90508135613360816130f0565b81526020828101359082015260408083013590820152606080830135908201526080808301359082015260a08201356001600160401b038111156133a2575f5ffd5b6133ae848285016132d0565b60a08301525092915050565b5f60a082840312156133ca575f5ffd5b6133d261323a565b905081356133df816130f0565b8152602082013560ff811681146133f4575f5ffd5b6020820152604082810135908201526060808301359082015260808201356001600160401b03811115613425575f5ffd5b6134318482850161333b565b60808301525092915050565b5f6020828403121561344d575f5ffd5b81356001600160401b03811115613462575f5ffd5b61346e848285016133ba565b949350505050565b5f6001600160401b0382111561348e5761348e6131fe565b5060051b60200190565b5f82601f8301126134a7575f5ffd5b81356134ba6134b582613476565b6132a0565b8082825260208201915060208360051b8601019250858311156134db575f5ffd5b602085015b838110156134f85780358352602092830192016134e0565b5095945050505050565b5f5f5f5f5f60a08688031215613516575f5ffd5b8535613521816130f0565b94506020860135613531816130f0565b935060408601356001600160401b0381111561354b575f5ffd5b61355788828901613498565b93505060608601356001600160401b03811115613572575f5ffd5b61357e88828901613498565b92505060808601356001600160401b03811115613599575f5ffd5b6135a5888289016132d0565b9150509295509295909350565b5f82601f8301126135c1575f5ffd5b81356135cf6134b582613476565b8082825260208201915060208360051b8601019250858311156135f0575f5ffd5b602085015b838110156134f8578035613608816130f0565b8352602092830192016135f5565b5f5f60408385031215613627575f5ffd5b82356001600160401b0381111561363c575f5ffd5b613648858286016135b2565b92505060208301356001600160401b03811115613663575f5ffd5b61366f858286016135b2565b9150509250929050565b602080825282518282018190525f918401906040840190835b818110156136e157835180516001600160a01b03908116855260208083015190911681860152604080830151908601526060918201519185019190915290930192608090920191600101613692565b509095945050505050565b5f5f604083850312156136fd575f5ffd5b82356001600160401b03811115613712575f5ffd5b61371e858286016135b2565b92505060208301356001600160401b03811115613739575f5ffd5b61366f85828601613498565b5f8151808452602084019350602083015f5b82811015613775578151865260209586019590910190600101613757565b5093949350505050565b602081525f61075c6020830184613745565b5f5f604083850312156137a2575f5ffd5b82356137ad816130f0565b915060208301356001600160401b038111156137c7575f5ffd5b61366f858286016132d0565b5f5f5f606084860312156137e5575f5ffd5b83356137f0816130f0565b92506020840135613800816130f0565b929592945050506040919091013590565b5f60208284031215613821575f5ffd5b81356001600160401b03811115613836575f5ffd5b820160808185031215613847575f5ffd5b61384f61325c565b813561385a816130f0565b8152602082013561386a816130f0565b6020820152604082013561387d816130f0565b604082015260608201356001600160401b0381111561389a575f5ffd5b80830192505084601f8301126138ae575f5ffd5b81356138bc6134b582613476565b808282526020820191506020606084028601019250878311156138dd575f5ffd5b6020850194505b8285101561396a5784880360608112156138fc575f5ffd5b61390461327e565b863581526040601f1983011215613919575f5ffd5b61392161327e565b9150602087013561ffff81168114613937575f5ffd5b82526040870135613947816130f0565b8060208401525081602082015280845250506020820191506060850194506138e4565b6060840152509095945050505050565b5f5f6040838503121561398b575f5ffd5b8235613996816130f0565b915060208301356001600160401b038111156139b0575f5ffd5b61366f8582860161333b565b801515811461213d575f5ffd5b5f5f604083850312156139da575f5ffd5b82356139e5816130f0565b91506020830135613181816139bc565b5f5f60408385031215613a06575f5ffd5b50508035926020909101359150565b5f5f60408385031215613a26575f5ffd5b82356001600160401b03811115613a3b575f5ffd5b613a478582860161333b565b95602094909401359450505050565b5f60208284031215613a66575f5ffd5b81356001600160401b03811115613a7b575f5ffd5b8201601f81018413613a8b575f5ffd5b8035613a996134b582613476565b8082825260208201915060208360051b850101925086831115613aba575f5ffd5b602084015b83811015613afa5780356001600160401b03811115613adc575f5ffd5b613aeb896020838901016133ba565b84525060209283019201613abf565b509695505050505050565b815161ffff1681526020808301516001600160a01b0316908201526040810161075f565b5f5f5f5f5f60a08688031215613b3d575f5ffd5b8535613b48816130f0565b94506020860135613b58816130f0565b9350604086013592506060860135915060808601356001600160401b03811115613599575f5ffd5b600181811c90821680613b9457607f821691505b602082108103613bb257634e487b7160e01b5f52602260045260245ffd5b50919050565b60208082526023908201527f435355433a207772617070696e6720302076616c7565206e6f7420616c6c6f7760408201526265642160e81b606082015260800190565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561075f5761075f613bfb565b6001600160a01b039384168152919092166020820152604081019190915260600190565b60208082526024908201527f435355433a20636f726520616374696f6e207769746864726177616c206661696040820152636c65642160e01b606082015260800190565b5f60208284031215613c9a575f5ffd5b81516111c0816130f0565b634e487b7160e01b5f52603260045260245ffd5b604081525f613ccb6040830185613745565b8281036020840152611eaf8185613745565b808202811582820484141761075f5761075f613bfb565b5f60208284031215613d04575f5ffd5b5051919050565b8181038181111561075f5761075f613bfb565b602080825282516001600160a01b039081168383015283820151811660408085019190915284015116606080840191909152830151608080840152805160a084018190525f929190910190829060c08501905b808310156134f857835180518352602090810151805161ffff16828501528101516001600160a01b031660408401529093019260019290920191606090910190613d71565b60018060a01b038151168252602081015160208301526040810151604083015260608101516060830152608081015160808301525f60a082015160c060a085015261346e60c08501826131a3565b838152606060208201525f613e1c6060830185613db6565b9050826040830152949350505050565b5f82613e4657634e487b7160e01b5f52601260045260245ffd5b500490565b6020815260018060a01b03825116602082015260ff602083015116604082015260408201516060820152606082015160808201525f608083015160a08084015261346e60c0840182613db6565b5f82518060208501845e5f920191825250919050565b5f60208284031215613ebe575f5ffd5b81516111c0816139bc565b5f60018201613eda57613eda613bfb565b5060010190565b60208082526023908201527f435355433a20616374696f6e207369676e6572206973206e6f7420636f72726560408201526263742160e81b606082015260800190565b601f82111561297357805f5260205f20601f840160051c81016020851015613f495750805b601f840160051c820191505b818110156115cc575f8155600101613f55565b81516001600160401b03811115613f8157613f816131fe565b613f9581613f8f8454613b80565b84613f24565b6020601f821160018114613fc7575f8315613fb05750848201515b5f19600385901b1c1916600184901b1784556115cc565b5f84815260208120601f198516915b82811015613ff65787850151825560209485019460019092019101613fd6565b508482101561401357868401515f19600387901b60f8161c191681555b50505050600190811b0190555056fe360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    sourceMap:
      "1211:19472:60:-:0;;;1171:4:17;1128:48;;1211:19472:60;;;;;;;;;-1:-1:-1;1857:1:44;2061:7;:21;1211:19472:60;;;;;;;;;;;;;;;;;;;;;;",
    linkReferences: {},
  },
  deployedBytecode: {
    object:
      "0x6080604052600436106101fb575f3560e01c806365df7ed911610113578063b726d8821161009d578063e985e9c51161006d578063e985e9c5146106b6578063efd61e60146106d5578063f242432a146106f4578063f2fde38b14610713578063f7888aec14610732575f5ffd5b8063b726d882146105e7578063c415b95c14610606578063c91db84314610625578063e3a4865f14610644575f5ffd5b80638129fc1c116100e35780638129fc1c146105295780638da5cb5b1461053d578063a22cb46514610579578063aba4ef1a14610598578063ad3cb1cc146105b7575f5ffd5b806365df7ed9146104a9578063715018a6146104c857806379d7ca52146104dc5780637aab69101461050a575f5ffd5b80632eb2c2d61161019457806352d1902d1161016457806352d1902d14610419578063570ca7351461042d5780635d85a3a11461044c578063623556381461046b57806363b5a5c01461047e575f5ffd5b80632eb2c2d61461038d5780633cb86b7a146103ae5780634e1273f4146103da5780634f1ef28614610406575f5ffd5b8063137db525116101cf578063137db525146102c2578063245a7bfc146103245780632479d8631461035b5780632860cfdf1461036e575f5ffd5b8062fdd58e146101ff57806301ffc9a71461023157806303f95bf1146102605780630e89341c14610296575b5f5ffd5b34801561020a575f5ffd5b5061021e610219366004613104565b610751565b6040519081526020015b60405180910390f35b34801561023c575f5ffd5b5061025061024b36600461312e565b610765565b6040519015158152602001610228565b34801561026b575f5ffd5b5061021e61027a366004613155565b600460209081525f928352604080842090915290825290205481565b3480156102a1575f5ffd5b506102b56102b036600461318c565b6107b4565b60405161022891906131d1565b3480156102cd575f5ffd5b506103026102dc36600461318c565b60056020525f908152604090205461ffff8116906201000090046001600160a01b031682565b6040805161ffff90931683526001600160a01b03909116602083015201610228565b34801561032f575f5ffd5b50600354610343906001600160a01b031681565b6040516001600160a01b039091168152602001610228565b6102506103693660046131e3565b610889565b348015610379575f5ffd5b5061025061038836600461343d565b61098d565b348015610398575f5ffd5b506103ac6103a7366004613502565b610bbe565b005b3480156103b9575f5ffd5b506103cd6103c8366004613616565b610d1e565b6040516102289190613679565b3480156103e5575f5ffd5b506103f96103f43660046136ec565b610eaa565b604051610228919061377f565b6103ac610414366004613791565b610f74565b348015610424575f5ffd5b5061021e610f93565b348015610438575f5ffd5b50600254610343906001600160a01b031681565b348015610457575f5ffd5b506102506104663660046137d3565b610fae565b6102506104793660046137d3565b6111c7565b348015610489575f5ffd5b5061021e61049836600461318c565b60066020525f908152604090205481565b3480156104b4575f5ffd5b506102506104c3366004613811565b61129b565b3480156104d3575f5ffd5b506103ac611420565b3480156104e7575f5ffd5b506102506104f636600461318c565b5f9081526006602052604090205443101590565b348015610515575f5ffd5b5061021e61052436600461397a565b611433565b348015610534575f5ffd5b506103ac61149e565b348015610548575f5ffd5b507f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b0316610343565b348015610584575f5ffd5b506103ac6105933660046139c9565b6115d3565b3480156105a3575f5ffd5b5061021e6105b23660046139f5565b6115de565b3480156105c2575f5ffd5b506102b5604051806040016040528060058152602001640352e302e360dc1b81525081565b3480156105f2575f5ffd5b5061021e610601366004613a15565b611617565b348015610611575f5ffd5b50600154610343906001600160a01b031681565b348015610630575f5ffd5b5061021e61063f366004613a56565b61164b565b34801561064f575f5ffd5b506106a961065e36600461318c565b604080518082019091525f8082526020820152505f9081526005602090815260409182902082518084019093525461ffff811683526201000090046001600160a01b03169082015290565b6040516102289190613b05565b3480156106c1575f5ffd5b506102506106d0366004613155565b611e31565b3480156106e0575f5ffd5b5061021e6106ef366004613155565b611e7d565b3480156106ff575f5ffd5b506103ac61070e366004613b29565b611eb8565b34801561071e575f5ffd5b506103ac61072d3660046131e3565b612103565b34801561073d575f5ffd5b5061021e61074c366004613155565b612140565b5f61075c8383612140565b90505b92915050565b5f6001600160e01b03198216636cdb3d1360e11b148061079557506001600160e01b031982166303a24d0760e21b145b8061075f57506301ffc9a760e01b6001600160e01b031983161461075f565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c450280546060917f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45009161080590613b80565b80601f016020809104026020016040519081016040528092919081815260200182805461083190613b80565b801561087c5780601f106108535761010080835404028352916020019161087c565b820191905f5260205f20905b81548152906001019060200180831161085f57829003601f168201915b5050505050915050919050565b5f345f036108b25760405162461bcd60e51b81526004016108a990613bb8565b60405180910390fd5b6001600160a01b0382165f9081527fabd6e7cb50984ff9c2f3e18a2660c3353dadf4e3291deeb275dae2cd1e44fe05602052604081205481906108f49061217b565b909250905061090c6109063484613c0f565b826121ae565b6001600160a01b0385165f9081527fabd6e7cb50984ff9c2f3e18a2660c3353dadf4e3291deeb275dae2cd1e44fe0560205260409081902091909155517f047711c4c8e7e4ce61a7632dc5a0f1f17f36835d34ef5f2f1859628dd5db88a79061097b9086906001903490613c22565b60405180910390a15060019392505050565b5f61099661235e565b6040516020016109d39060208082526019908201527810d4d550d7d5d2551211149055d05317d050d51253d397d251603a1b604082015260600190565b604051602081830303815290604052805190602001205f1c82608001516020015114610a3a5760405162461bcd60e51b8152602060048201526016602482015275435355433a2077726f6e6720616374696f6e2069642160501b60448201526064016108a9565b610a4382612386565b610a9b5760405162461bcd60e51b815260206004820152602360248201527f435355433a207769746864726177616c20616374696f6e20697320696e76616c60448201526269642160e81b60648201526084016108a9565b610aa4826124c5565b610ac05760405162461bcd60e51b81526004016108a990613c46565b6080820151516001600160a01b039081165f90815260046020908152604080832086519094168352929052908120548190610afa9061217b565b91509150610b15846080015160600151836109069190613c0f565b608085018051516001600160a01b039081165f908152600460209081526040808320600154909416835292815291812093909355905160a001518051610b619290820181019101613c8a565b6080860151805160409182015191519293507f1bbee009b0b564574ffaa8fb78789b54236b986ed71913a080600f359b0f4df692610ba192859291613c22565b60405180910390a160019350505050610bb960015f55565b919050565b8151835114610c1d5760405162461bcd60e51b815260206004820152602560248201527f435355433a2069647320616e642076616c756573206c656e677468206d69736d604482015264617463682160d81b60648201526084016108a9565b82515f03610c6d5760405162461bcd60e51b815260206004820152601d60248201527f435355433a206172726179732063616e6e6f7420626520656d7074792100000060448201526064016108a9565b5f5b8351811015610cbf57610cb78686868481518110610c8f57610c8f613ca5565b6020026020010151868581518110610ca957610ca9613ca5565b602002602001015186611eb8565b600101610c6f565b50836001600160a01b0316856001600160a01b0316336001600160a01b03167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb8686604051610d0f929190613cb9565b60405180910390a45050505050565b606081518351610d2e9190613cdd565b6001600160401b03811115610d4557610d456131fe565b604051908082528060200260200182016040528015610d9557816020015b604080516080810182525f8082526020808301829052928201819052606082015282525f19909201910181610d635790505b5090505f5b8351811015610ea3576040518060800160405280858381518110610dc057610dc0613ca5565b60200260200101516001600160a01b03168152602001848381518110610de857610de8613ca5565b60200260200101516001600160a01b03168152602001610e3a868481518110610e1357610e13613ca5565b6020026020010151868581518110610e2d57610e2d613ca5565b6020026020010151612140565b8152602001610e7b868481518110610e5457610e54613ca5565b6020026020010151868581518110610e6e57610e6e613ca5565b6020026020010151611e7d565b815250828281518110610e9057610e90613ca5565b6020908102919091010152600101610d9a565b5092915050565b60608151835114610edb5781518351604051635b05999160e01b8152600481019290925260248201526044016108a9565b5f83516001600160401b03811115610ef557610ef56131fe565b604051908082528060200260200182016040528015610f1e578160200160208202803683370190505b5090505f5b8451811015610f6c57602080820286010151610f4790602080840287010151610751565b828281518110610f5957610f59613ca5565b6020908102919091010152600101610f23565b509392505050565b610f7c61280b565b610f85826128af565b610f8f82826128b7565b5050565b5f610f9c612978565b505f5160206140235f395f51905f5290565b5f815f03610fce5760405162461bcd60e51b81526004016108a990613bb8565b6040516370a0823160e01b81523060048201525f906001600160a01b038516906370a0823190602401602060405180830381865afa158015611012573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110369190613cf4565b905061104d6001600160a01b0385163330866129c1565b6040516370a0823160e01b81523060048201525f906001600160a01b038616906370a0823190602401602060405180830381865afa158015611091573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906110b59190613cf4565b9050836110c28383613d0b565b1461110f5760405162461bcd60e51b815260206004820152601c60248201527f435355433a204552433230207472616e73666572206661696c6564210000000060448201526064016108a9565b6001600160a01b038086165f908152600460209081526040808320938a1683529290529081205481906111419061217b565b90925090506111536109068784613c0f565b6001600160a01b038089165f908152600460209081526040808320938d16835292905281902091909155517f047711c4c8e7e4ce61a7632dc5a0f1f17f36835d34ef5f2f1859628dd5db88a7906111af908a908a908a90613c22565b60405180910390a160019450505050505b9392505050565b5f341561122f576111d784610889565b61122f5760405162461bcd60e51b815260206004820152602360248201527f435355433a206e617469766520746f6b656e207772617070696e67206661696c60448201526265642160e81b60648201526084016108a9565b61123a848484610fae565b6112915760405162461bcd60e51b815260206004820152602260248201527f435355433a20455243323020746f6b656e207772617070696e67206661696c65604482015261642160f01b60648201526084016108a9565b5060019392505050565b5f6112a4612a21565b81516001600160a01b0316156112d6578151600280546001600160a01b0319166001600160a01b039092169190911790555b60208201516001600160a01b03161561130e576020820151600180546001600160a01b0319166001600160a01b039092169190911790555b60408201516001600160a01b031615611346576040820151600380546001600160a01b0319166001600160a01b039092169190911790555b5f5b8260600151518110156113e0575f8360600151828151811061136c5761136c613ca5565b6020908102919091018101518082015181515f90815260058452604090208151815492909401516001600160a01b031662010000026001600160b01b031990921661ffff909416939093171790915590506113c8600143613c0f565b90515f90815260066020526040902055600101611348565b507f09625a48c17c53b2ebcdec381272eac2dc81b298e12f2a293643b55f19009612826040516114109190613d1e565b60405180910390a1506001919050565b611428612a21565b6114315f612a7c565b565b80516001600160a01b039081165f90815260046020908152604080832093861683529290529081205481906114679061217b565b91505046838260405160200161147f93929190613e04565b6040516020818303038152906040528051906020012091505092915050565b5f6114a7612aec565b805490915060ff600160401b82041615906001600160401b03165f811580156114cd5750825b90505f826001600160401b031660011480156114e85750303b155b9050811580156114f6575080155b156115145760405163f92ee8a960e01b815260040160405180910390fd5b845467ffffffffffffffff19166001178555831561153e57845460ff60401b1916600160401b1785555b61154733612b14565b61154f612b25565b6115866040518060400160405280601681526020017568747470733a2f2f63757276792e626f782f6373756360501b815250612b2d565b83156115cc57845460ff60401b19168555604051600181527fc7f505b2f371ae2175ee4913f4499e1f2633a7b5936321eed1cdaeb6115181d29060200160405180910390a15b5050505050565b610f8f338383612b3e565b5f828152600560205260408120546402540be4009061160290849061ffff16613cdd565b61160c9190613e2c565b61075c906001613c0f565b5f46838360405160200161162d93929190613e04565b60405160208183030381529060405280519060200120905092915050565b6002545f906001600160a01b031633146116ba5760405162461bcd60e51b815260206004820152602a60248201527f435355433a206f6e6c79206f70657261746f722063616e206578656375746520604482015269746869732063616c6c2160b01b60648201526084016108a9565b6116c261235e565b5f8080805b8551811015611e24578581815181106116e2576116e2613ca5565b6020026020010151608001515f0151925085818151811061170557611705613ca5565b60200260200101516080015160600151826117209190613c0f565b9150600186516117309190613d0b565b8114806117ac57506040516020016117709060208082526014908201527310d4d550d7d0d311505497d050d51253d397d25160621b604082015260600190565b604051602081830303815290604052805190602001205f1c86828151811061179a5761179a613ca5565b60200260200101516080015160200151145b15611866576001600160a01b038084165f90815260046020908152604080832060015490941683529290529081205481906117e69061217b565b90925090506117f86109068584613c0f565b6001600160a01b038087165f90815260046020908152604080832060015490941683529290522055875188908490811061183457611834613ca5565b6020026020010151608001515f015194505f9350600188516118569190613d0b565b8314611863575050611e1c565b50505b61188886828151811061187b5761187b613ca5565b6020026020010151612386565b1515600103611e1c576040516020016118cc9060208082526017908201527610d4d550d7d514905394d1915497d050d51253d397d251604a1b604082015260600190565b604051602081830303815290604052805190602001205f1c8682815181106118f6576118f6613ca5565b60200260200101516080015160200151036119895761192d86828151811061192057611920613ca5565b6020026020010151612bf6565b6119845760405162461bcd60e51b815260206004820152602260248201527f435355433a20636f726520616374696f6e207472616e73666572206661696c65604482015261642160f01b60648201526084016108a9565b611dc0565b6040516020016119c69060208082526019908201527810d4d550d7d5d2551211149055d05317d050d51253d397d251603a1b604082015260600190565b604051602081830303815290604052805190602001205f1c8682815181106119f0576119f0613ca5565b6020026020010151608001516020015103611a4357611a27868281518110611a1a57611a1a613ca5565b60200260200101516124c5565b6119845760405162461bcd60e51b81526004016108a990613c46565b611a7c868281518110611a5857611a58613ca5565b602002602001015160800151602001515f9081526006602052604090205443101590565b15611e1c575f60055f888481518110611a9757611a97613ca5565b6020908102919091018101516080015181015182528101919091526040015f20546201000090046001600160a01b0316905080611b165760405162461bcd60e51b815260206004820152601d60248201527f435355433a20616374696f6e2068616e646c6572206e6f74207365742100000060448201526064016108a9565b6001600160a01b0384165f9081526004602052604081208851611b78919083908b9087908110611b4857611b48613ca5565b60200260200101515f01516001600160a01b03166001600160a01b031681526020019081526020015f205461217b565b9150505f5f836001600160a01b03166391c0cda460e01b8b8781518110611ba157611ba1613ca5565b6020026020010151604051602401611bb99190613e4b565b60408051601f198184030181529181526020820180516001600160e01b03166001600160e01b0319909416939093179092529051611bf79190613e98565b5f60405180830381855af49150503d805f8114611c2f576040519150601f19603f3d011682016040523d82523d5f602084013e611c34565b606091505b509150915081611c975760405162461bcd60e51b815260206004820152602860248201527f435355433a20637573746f6d20616374696f6e2068616e646c65722063616c6c604482015267206661696c65642160c01b60648201526084016108a9565b5f81806020019051810190611cac9190613eae565b905080611d0f5760405162461bcd60e51b815260206004820152602b60248201527f435355433a20637573746f6d20616374696f6e2068616e646c6572207265747560448201526a726e65642066616c73652160a81b60648201526084016108a9565b6001600160a01b0388165f9081526004602052604081208c51611d41919083908f908b908110611b4857611b48613ca5565b9150611d509050856001613c0f565b8114611db95760405162461bcd60e51b815260206004820152603260248201527f435355433a20637573746f6d20616374696f6e2068616e646c6572206e6f6e6360448201527165206e6f7420696e6372656d656e7465642160701b60648201526084016108a9565b5050505050505b611dc984613ec9565b93507f10e88280d3da28fd02bac1a8f23ffdec17105b9276c74971e481dc8bb81399b2868281518110611dfe57611dfe613ca5565b6020026020010151604051611e139190613e4b565b60405180910390a15b6001016116c7565b505060015f555092915050565b6001600160a01b039182165f9081527f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45016020908152604080832093909416825291909152205460ff1690565b6001600160a01b038082165f9081526004602090815260408083209386168352929052908120548190611eaf9061217b565b95945050505050565b611ec28533611e31565b80611ed55750336001600160a01b038616145b611f215760405162461bcd60e51b815260206004820152601d60248201527f435355433a2063616c6c6572206973206e6f7420617070726f7665642100000060448201526064016108a9565b5f8390505f611f82604051602001611f649060208082526017908201527610d4d550d7d514905394d1915497d050d51253d397d251604a1b604082015260600190565b604051602081830303815290604052805190602001205f1c856115de565b90505f611f8f8286613c0f565b9050611f9c838983612d55565b6001600160a01b038084165f908152600460209081526040808320938c168352929052908120548190611fce9061217b565b9092509050611ff0611fe08484613d0b565b611feb836001613c0f565b6121ae565b6001600160a01b038681165f9081526004602090815260408083208f8516845290915280822093909355908b168152205461202a9061217b565b909250905061203c6109068884613c0f565b6001600160a01b038681165f9081526004602090815260408083208e8516845290915280822093909355600154909116815220546120799061217b565b909250905061208b6109068584613c0f565b6001600160a01b038681165f908152600460209081526040808320600154851684528252918290209390935580518b81529283018a90528b821692918d169133917fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62910160405180910390a450505050505050505050565b61210b612a21565b6001600160a01b03811661213457604051631e4fbdf760e01b81525f60048201526024016108a9565b61213d81612a7c565b50565b6001600160a01b038082165f90815260046020908152604080832093861683529290529081205481906121729061217b565b50949350505050565b5f8061218c6001600160c81b613d0b565b603784901c166121a460016680000000000000613d0b565b9094931692915050565b5f6121be6001600160c81b613d0b565b8311156122175760405162461bcd60e51b815260206004820152602160248201527f435355433a2062616c616e636520697320746f6f2062696720746f207061636b6044820152602160f81b60648201526084016108a9565b6001612224816037613d0b565b6001901b6122329190613d0b565b8211156122815760405162461bcd60e51b815260206004820152601f60248201527f435355433a206e6f6e636520697320746f6f2062696720746f207061636b210060448201526064016108a9565b50603782901b81175f806122948361217b565b915091508482146122f85760405162461bcd60e51b815260206004820152602860248201527f435355433a20636865636b696e672062616c616e636520756e7061636b696e67604482015267206661696c65642160c01b60648201526084016108a9565b8381146123565760405162461bcd60e51b815260206004820152602660248201527f435355433a20636865636b696e67206e6f6e636520756e7061636b696e67206660448201526561696c65642160d01b60648201526084016108a9565b505092915050565b60025f540361238057604051633ee5aeb560e01b815260040160405180910390fd5b60025f55565b5f5f600161239b845f01518560800151611433565b8460200151856040015186606001516040515f81526020016040526040516123df949392919093845260ff9290921660208401526040830152606082015260800190565b6020604051602081039080840390855afa1580156123ff573d5f5f3e3d5ffd5b5050604051601f19015184519092506001600160a01b0380841691161490508061243b5760405162461bcd60e51b81526004016108a990613ee1565b6080808501510151431115816124635760405162461bcd60e51b81526004016108a990613ee1565b5f61247e8660800151602001518760800151604001516115de565b86608001516060015110159050826124a85760405162461bcd60e51b81526004016108a990613ee1565b8280156124b25750815b80156124bb5750805b9695505050505050565b5f5f8260800151604001518360800151606001516124e39190613c0f565b60808401515184519192506124f89183612d55565b6080830151516001600160a01b039081165f908152600460209081526040808320875190941683529290529081205481906125329061217b565b9092509050612544611fe08484613d0b565b608086018051516001600160a01b039081165f9081526004602090815260408083208b51909416835292815291812093909355905160a00151805161258f9290820181019101613c8a565b90505f5f60016001600160a01b031688608001515f01516001600160a01b03160361267c57608088015160409081015190516001600160a01b0385168031945091905f81818185875af1925050503d805f8114612607576040519150601f19603f3d011682016040523d82523d5f602084013e61260c565b606091505b5050809750508661266b5760405162461bcd60e51b815260206004820152602360248201527f435355433a206e617469766520746f6b656e207472616e73666572206661696c60448201526265642160e81b60648201526084016108a9565b506001600160a01b03821631612781565b6080880151516040516370a0823160e01b81526001600160a01b038581166004830152909116906370a0823190602401602060405180830381865afa1580156126c7573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906126eb9190613cf4565b60808901516040810151905191935061270f916001600160a01b0316908590612deb565b6080880151516040516370a0823160e01b81526001600160a01b038581166004830152909116906370a0823190602401602060405180830381865afa15801561275a573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061277e9190613cf4565b90505b81886080015160400151826127969190613d0b565b149650866127fd5760405162461bcd60e51b815260206004820152602e60248201527f435355433a207769746864726177616c206661696c6564202d20616d6f756e7460448201526d7320646f6e2774206d617463682160901b60648201526084016108a9565b506001979650505050505050565b306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016148061289157507f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03166128855f5160206140235f395f51905f52546001600160a01b031690565b6001600160a01b031614155b156114315760405163703e46dd60e11b815260040160405180910390fd5b61213d612a21565b816001600160a01b03166352d1902d6040518163ffffffff1660e01b8152600401602060405180830381865afa925050508015612911575060408051601f3d908101601f1916820190925261290e91810190613cf4565b60015b61293957604051634c9c8ce360e01b81526001600160a01b03831660048201526024016108a9565b5f5160206140235f395f51905f52811461296957604051632a87526960e21b8152600481018290526024016108a9565b6129738383612e1c565b505050565b306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146114315760405163703e46dd60e11b815260040160405180910390fd5b612a1b84856001600160a01b03166323b872dd8686866040516024016129e993929190613c22565b604051602081830303815290604052915060e01b6020820180516001600160e01b038381831617835250505050612e71565b50505050565b33612a537f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300546001600160a01b031690565b6001600160a01b0316146114315760405163118cdaa760e01b81523360048201526024016108a9565b7f9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c19930080546001600160a01b031981166001600160a01b03848116918217845560405192169182907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0905f90a3505050565b5f807ff0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a0061075f565b612b1c612edd565b61213d81612f02565b611431612edd565b612b35612edd565b61213d81612f0a565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45006001600160a01b038316612b875760405162ced3e160e81b81525f60048201526024016108a9565b6001600160a01b038481165f818152600184016020908152604080832094881680845294825291829020805460ff191687151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a350505050565b5f5f826080015160400151836080015160600151612c149190613c0f565b6080840151518451919250612c299183612d55565b6080830151516001600160a01b039081165f90815260046020908152604080832087519094168352929052908120548190612c639061217b565b9092509050612c75611fe08484613d0b565b608086018051516001600160a01b039081165f9081526004602090815260408083208b51909416835292815291812093909355905160a001518051612cc09290820181019101613c8a565b6080870151516001600160a01b039081165f90815260046020908152604080832093851683529290522054909150612cf79061217b565b6080880151604001519194509250612d1990612d139085613c0f565b836121ae565b608090960151516001600160a01b039081165f908152600460209081526040808320949093168252929092529020949094555060019392505050565b6001600160a01b038084165f908152600460209081526040808320938616835292905290812054612d859061217b565b50905081811015612a1b5760405162461bcd60e51b815260206004820152602a60248201527f435355433a2062616c616e6365206973206e6f7420656e6f75676820746f20636044820152696f76657220636f73742160b01b60648201526084016108a9565b6040516001600160a01b0383811660248301526044820183905261297391859182169063a9059cbb906064016129e9565b612e2582612f1b565b6040516001600160a01b038316907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b905f90a2805115612e69576129738282612f7e565b610f8f612fe7565b5f5f60205f8451602086015f885af180612e90576040513d5f823e3d81fd5b50505f513d91508115612ea7578060011415612eb4565b6001600160a01b0384163b155b15612a1b57604051635274afe760e01b81526001600160a01b03851660048201526024016108a9565b612ee5613006565b61143157604051631afcd79f60e31b815260040160405180910390fd5b61210b612edd565b612f12612edd565b61213d8161301f565b806001600160a01b03163b5f03612f5057604051634c9c8ce360e01b81526001600160a01b03821660048201526024016108a9565b5f5160206140235f395f51905f5280546001600160a01b0319166001600160a01b0392909216919091179055565b60605f5f846001600160a01b031684604051612f9a9190613e98565b5f60405180830381855af49150503d805f8114612fd2576040519150601f19603f3d011682016040523d82523d5f602084013e612fd7565b606091505b5091509150611eaf85838361306b565b34156114315760405163b398979f60e01b815260040160405180910390fd5b5f61300f612aec565b54600160401b900460ff16919050565b7f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45007f88be536d5240c274a3b1d3a1be54482fd9caa294f08c62a7cde569f49a3c45026129738382613f68565b6060826130805761307b826130c7565b6111c0565b815115801561309757506001600160a01b0384163b155b156130c057604051639996b31560e01b81526001600160a01b03851660048201526024016108a9565b50806111c0565b8051156130d75780518082602001fd5b60405163d6bda27560e01b815260040160405180910390fd5b6001600160a01b038116811461213d575f5ffd5b5f5f60408385031215613115575f5ffd5b8235613120816130f0565b946020939093013593505050565b5f6020828403121561313e575f5ffd5b81356001600160e01b0319811681146111c0575f5ffd5b5f5f60408385031215613166575f5ffd5b8235613171816130f0565b91506020830135613181816130f0565b809150509250929050565b5f6020828403121561319c575f5ffd5b5035919050565b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b602081525f61075c60208301846131a3565b5f602082840312156131f3575f5ffd5b81356111c0816130f0565b634e487b7160e01b5f52604160045260245ffd5b60405160c081016001600160401b0381118282101715613234576132346131fe565b60405290565b60405160a081016001600160401b0381118282101715613234576132346131fe565b604051608081016001600160401b0381118282101715613234576132346131fe565b604080519081016001600160401b0381118282101715613234576132346131fe565b604051601f8201601f191681016001600160401b03811182821017156132c8576132c86131fe565b604052919050565b5f82601f8301126132df575f5ffd5b81356001600160401b038111156132f8576132f86131fe565b61330b601f8201601f19166020016132a0565b81815284602083860101111561331f575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f60c0828403121561334b575f5ffd5b613353613212565b90508135613360816130f0565b81526020828101359082015260408083013590820152606080830135908201526080808301359082015260a08201356001600160401b038111156133a2575f5ffd5b6133ae848285016132d0565b60a08301525092915050565b5f60a082840312156133ca575f5ffd5b6133d261323a565b905081356133df816130f0565b8152602082013560ff811681146133f4575f5ffd5b6020820152604082810135908201526060808301359082015260808201356001600160401b03811115613425575f5ffd5b6134318482850161333b565b60808301525092915050565b5f6020828403121561344d575f5ffd5b81356001600160401b03811115613462575f5ffd5b61346e848285016133ba565b949350505050565b5f6001600160401b0382111561348e5761348e6131fe565b5060051b60200190565b5f82601f8301126134a7575f5ffd5b81356134ba6134b582613476565b6132a0565b8082825260208201915060208360051b8601019250858311156134db575f5ffd5b602085015b838110156134f85780358352602092830192016134e0565b5095945050505050565b5f5f5f5f5f60a08688031215613516575f5ffd5b8535613521816130f0565b94506020860135613531816130f0565b935060408601356001600160401b0381111561354b575f5ffd5b61355788828901613498565b93505060608601356001600160401b03811115613572575f5ffd5b61357e88828901613498565b92505060808601356001600160401b03811115613599575f5ffd5b6135a5888289016132d0565b9150509295509295909350565b5f82601f8301126135c1575f5ffd5b81356135cf6134b582613476565b8082825260208201915060208360051b8601019250858311156135f0575f5ffd5b602085015b838110156134f8578035613608816130f0565b8352602092830192016135f5565b5f5f60408385031215613627575f5ffd5b82356001600160401b0381111561363c575f5ffd5b613648858286016135b2565b92505060208301356001600160401b03811115613663575f5ffd5b61366f858286016135b2565b9150509250929050565b602080825282518282018190525f918401906040840190835b818110156136e157835180516001600160a01b03908116855260208083015190911681860152604080830151908601526060918201519185019190915290930192608090920191600101613692565b509095945050505050565b5f5f604083850312156136fd575f5ffd5b82356001600160401b03811115613712575f5ffd5b61371e858286016135b2565b92505060208301356001600160401b03811115613739575f5ffd5b61366f85828601613498565b5f8151808452602084019350602083015f5b82811015613775578151865260209586019590910190600101613757565b5093949350505050565b602081525f61075c6020830184613745565b5f5f604083850312156137a2575f5ffd5b82356137ad816130f0565b915060208301356001600160401b038111156137c7575f5ffd5b61366f858286016132d0565b5f5f5f606084860312156137e5575f5ffd5b83356137f0816130f0565b92506020840135613800816130f0565b929592945050506040919091013590565b5f60208284031215613821575f5ffd5b81356001600160401b03811115613836575f5ffd5b820160808185031215613847575f5ffd5b61384f61325c565b813561385a816130f0565b8152602082013561386a816130f0565b6020820152604082013561387d816130f0565b604082015260608201356001600160401b0381111561389a575f5ffd5b80830192505084601f8301126138ae575f5ffd5b81356138bc6134b582613476565b808282526020820191506020606084028601019250878311156138dd575f5ffd5b6020850194505b8285101561396a5784880360608112156138fc575f5ffd5b61390461327e565b863581526040601f1983011215613919575f5ffd5b61392161327e565b9150602087013561ffff81168114613937575f5ffd5b82526040870135613947816130f0565b8060208401525081602082015280845250506020820191506060850194506138e4565b6060840152509095945050505050565b5f5f6040838503121561398b575f5ffd5b8235613996816130f0565b915060208301356001600160401b038111156139b0575f5ffd5b61366f8582860161333b565b801515811461213d575f5ffd5b5f5f604083850312156139da575f5ffd5b82356139e5816130f0565b91506020830135613181816139bc565b5f5f60408385031215613a06575f5ffd5b50508035926020909101359150565b5f5f60408385031215613a26575f5ffd5b82356001600160401b03811115613a3b575f5ffd5b613a478582860161333b565b95602094909401359450505050565b5f60208284031215613a66575f5ffd5b81356001600160401b03811115613a7b575f5ffd5b8201601f81018413613a8b575f5ffd5b8035613a996134b582613476565b8082825260208201915060208360051b850101925086831115613aba575f5ffd5b602084015b83811015613afa5780356001600160401b03811115613adc575f5ffd5b613aeb896020838901016133ba565b84525060209283019201613abf565b509695505050505050565b815161ffff1681526020808301516001600160a01b0316908201526040810161075f565b5f5f5f5f5f60a08688031215613b3d575f5ffd5b8535613b48816130f0565b94506020860135613b58816130f0565b9350604086013592506060860135915060808601356001600160401b03811115613599575f5ffd5b600181811c90821680613b9457607f821691505b602082108103613bb257634e487b7160e01b5f52602260045260245ffd5b50919050565b60208082526023908201527f435355433a207772617070696e6720302076616c7565206e6f7420616c6c6f7760408201526265642160e81b606082015260800190565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561075f5761075f613bfb565b6001600160a01b039384168152919092166020820152604081019190915260600190565b60208082526024908201527f435355433a20636f726520616374696f6e207769746864726177616c206661696040820152636c65642160e01b606082015260800190565b5f60208284031215613c9a575f5ffd5b81516111c0816130f0565b634e487b7160e01b5f52603260045260245ffd5b604081525f613ccb6040830185613745565b8281036020840152611eaf8185613745565b808202811582820484141761075f5761075f613bfb565b5f60208284031215613d04575f5ffd5b5051919050565b8181038181111561075f5761075f613bfb565b602080825282516001600160a01b039081168383015283820151811660408085019190915284015116606080840191909152830151608080840152805160a084018190525f929190910190829060c08501905b808310156134f857835180518352602090810151805161ffff16828501528101516001600160a01b031660408401529093019260019290920191606090910190613d71565b60018060a01b038151168252602081015160208301526040810151604083015260608101516060830152608081015160808301525f60a082015160c060a085015261346e60c08501826131a3565b838152606060208201525f613e1c6060830185613db6565b9050826040830152949350505050565b5f82613e4657634e487b7160e01b5f52601260045260245ffd5b500490565b6020815260018060a01b03825116602082015260ff602083015116604082015260408201516060820152606082015160808201525f608083015160a08084015261346e60c0840182613db6565b5f82518060208501845e5f920191825250919050565b5f60208284031215613ebe575f5ffd5b81516111c0816139bc565b5f60018201613eda57613eda613bfb565b5060010190565b60208082526023908201527f435355433a20616374696f6e207369676e6572206973206e6f7420636f72726560408201526263742160e81b606082015260800190565b601f82111561297357805f5260205f20601f840160051c81016020851015613f495750805b601f840160051c820191505b818110156115cc575f8155600101613f55565b81516001600160401b03811115613f8157613f816131fe565b613f9581613f8f8454613b80565b84613f24565b6020601f821160018114613fc7575f8315613fb05750848201515b5f19600385901b1c1916600184901b1784556115cc565b5f84815260208120601f198516915b82811015613ff65787850151825560209485019460019092019101613fd6565b508482101561401357868401515f19600387901b60f8161c191681555b50505050600190811b0190555056fe360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    sourceMap:
      "1211:19472:60:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;5504:177;;;;;;;;;;-1:-1:-1;5504:177:60;;;;;:::i;:::-;;:::i;:::-;;;668:25:70;;;656:2;641:18;5504:177:60;;;;;;;;2419:316:18;;;;;;;;;;-1:-1:-1;2419:316:18;;;;;:::i;:::-;;:::i;:::-;;;1160:14:70;;1153:22;1135:41;;1123:2;1108:18;2419:316:18;995:187:70;20055:70:60;;;;;;;;;;-1:-1:-1;20055:70:60;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;3134:162:18;;;;;;;;;;-1:-1:-1;3134:162:18;;;;;:::i;:::-;;:::i;:::-;;;;;;;:::i;20197:67:60:-;;;;;;;;;;-1:-1:-1;20197:67:60;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;20197:67:60;;;;;;;2532:6:70;2520:19;;;2502:38;;-1:-1:-1;;;;;2576:32:70;;;2571:2;2556:18;;2549:60;2475:18;20197:67:60;2330:285:70;19873:25:60;;;;;;;;;;-1:-1:-1;19873:25:60;;;;-1:-1:-1;;;;;19873:25:60;;;;;;-1:-1:-1;;;;;2784:32:70;;;2766:51;;2754:2;2739:18;19873:25:60;2620:203:70;8334:471:60;;;;;;:::i;:::-;;:::i;9604:829::-;;;;;;;;;;-1:-1:-1;9604:829:60;;;;;:::i;:::-;;:::i;6911:575::-;;;;;;;;;;-1:-1:-1;6911:575:60;;;;;:::i;:::-;;:::i;:::-;;10885:591;;;;;;;;;;-1:-1:-1;10885:591:60;;;;;:::i;:::-;;:::i;:::-;;;;;;;:::i;3704:552:18:-;;;;;;;;;;-1:-1:-1;3704:552:18;;;;;:::i;:::-;;:::i;:::-;;;;;;;:::i;4161:214:17:-;;;;;;:::i;:::-;;:::i;3708:134::-;;;;;;;;;;;;;:::i;19763:23:60:-;;;;;;;;;;-1:-1:-1;19763:23:60;;;;-1:-1:-1;;;;;19763:23:60;;;8837:735;;;;;;;;;;-1:-1:-1;8837:735:60;;;;;:::i;:::-;;:::i;7977:325::-;;;;;;:::i;:::-;;:::i;20357:56::-;;;;;;;;;;-1:-1:-1;20357:56:60;;;;;:::i;:::-;;;;;;;;;;;;;;1619:862;;;;;;;;;;-1:-1:-1;1619:862:60;;;;;:::i;:::-;;:::i;3155:101:15:-;;;;;;;;;;;;;:::i;5317:142:60:-;;;;;;;;;;-1:-1:-1;5317:142:60;;;;;:::i;:::-;5381:4;5404:32;;;:21;:32;;;;;;5440:12;-1:-1:-1;5404:48:60;;5317:142;13082:320;;;;;;;;;;-1:-1:-1;13082:320:60;;;;;:::i;:::-;;:::i;1329:167::-;;;;;;;;;;;;;:::i;2441:144:15:-;;;;;;;;;;-1:-1:-1;1313:22:15;2570:8;-1:-1:-1;;;;;2570:8:15;2441:144;;4324::18;;;;;;;;;;-1:-1:-1;4324:144:18;;;;;:::i;:::-;;:::i;10465:202:60:-;;;;;;;;;;-1:-1:-1;10465:202:60;;;;;:::i;:::-;;:::i;1819:58:17:-;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;1819:58:17;;;;;13917:243:60;;;;;;;;;;-1:-1:-1;13917:243:60;;;;;:::i;:::-;;:::i;19648:27::-;;;;;;;;;;-1:-1:-1;19648:27:60;;;;-1:-1:-1;;;;;19648:27:60;;;2513:2772;;;;;;;;;;-1:-1:-1;2513:2772:60;;;;;:::i;:::-;;:::i;10699:154::-;;;;;;;;;;-1:-1:-1;10699:154:60;;;;;:::i;:::-;-1:-1:-1;;;;;;;;;;;;;;;;;;10825:21:60;;;;:10;:21;;;;;;;;;10818:28;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;10818:28:60;;;;;;10699:154;;;;;;;;:::i;4535:216:18:-;;;;;;;;;;-1:-1:-1;4535:216:18;;;;;:::i;:::-;;:::i;7750:195:60:-;;;;;;;;;;-1:-1:-1;7750:195:60;;;;;:::i;:::-;;:::i;5726:1140::-;;;;;;;;;;-1:-1:-1;5726:1140:60;;;;;:::i;:::-;;:::i;3405:215:15:-;;;;;;;;;;-1:-1:-1;3405:215:15;;;;;:::i;:::-;;:::i;7518:200:60:-;;;;;;;;;;-1:-1:-1;7518:200:60;;;;;:::i;:::-;;:::i;5504:177::-;5605:7;5631:43;5641:6;5665;5631:9;:43::i;:::-;5624:50;;5504:177;;;;;:::o;2419:316:18:-;2532:4;-1:-1:-1;;;;;;2567:41:18;;-1:-1:-1;;;2567:41:18;;:109;;-1:-1:-1;;;;;;;2624:52:18;;-1:-1:-1;;;2624:52:18;2567:109;:161;;;-1:-1:-1;;;;;;;;;;1134:40:20;;;2692:36:18;1035:146:20;3134:162:18;3283:6;3276:13;;3194;;2032:22;;3276:13;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;3134:162;;;:::o;8334:471:60:-;8391:4;8415:9;8428:1;8415:14;8407:62;;;;-1:-1:-1;;;8407:62:60;;;;;;;:::i;:::-;;;;;;;;;-1:-1:-1;;;;;8540:49:60;;8481:16;8540:49;;;:44;;:49;:44;:49;;;8481:16;;8517:73;;:22;:73::i;:::-;8480:110;;-1:-1:-1;8480:110:60;-1:-1:-1;8652:50:60;8673:20;8684:9;8480:110;8673:20;:::i;:::-;8695:6;8652:20;:50::i;:::-;-1:-1:-1;;;;;8600:49:60;;:44;:49;;;:44;;:49;:44;:49;;;;:102;;;;8718:58;;;;;8645:3;;1929:1:68;;8766:9:60;;8718:58;:::i;:::-;;;;;;;;-1:-1:-1;8794:4:60;;8334:471;-1:-1:-1;;;8334:471:60:o;9604:829::-;9683:4;2500:21:44;:19;:21::i;:::-;993:39:68::1;;;;;;22136:2:70::0;22118:21;;;22175:2;22155:18;;;22148:30;-1:-1:-1;;;22209:2:70;22194:18;;22187:55;22274:2;22259:18;;21934:349;993:39:68::1;;;;;;;;;;;;;983:50;;;;;;975:59;;9707:7:60;:15;;;:24;;;:63;9699:98;;;::::0;-1:-1:-1;;;9699:98:60;;22490:2:70;9699:98:60::1;::::0;::::1;22472:21:70::0;22529:2;22509:18;;;22502:30;-1:-1:-1;;;22548:18:70;;;22541:52;22610:18;;9699:98:60::1;22288:346:70::0;9699:98:60::1;9816:23;9831:7;9816:14;:23::i;:::-;9808:71;;;::::0;-1:-1:-1;;;9808:71:60;;22841:2:70;9808:71:60::1;::::0;::::1;22823:21:70::0;22880:2;22860:18;;;22853:30;22919:34;22899:18;;;22892:62;-1:-1:-1;;;22970:18:70;;;22963:33;23013:19;;9808:71:60::1;22639:399:70::0;9808:71:60::1;9898:30;9920:7;9898:21;:30::i;:::-;9890:79;;;;-1:-1:-1::0;;;9890:79:60::1;;;;;;;:::i;:::-;10068:15;::::0;::::1;::::0;:21;-1:-1:-1;;;;;10052:38:60;;::::1;9981:16;10052:38:::0;;;:15:::1;:38;::::0;;;;;;;10091:12;;10052:52;;::::1;::::0;;;;;;;;;9981:16;;10029:76:::1;::::0;:22:::1;:76::i;:::-;9980:125;;;;10182:65;10214:7;:15;;;:24;;;10203:8;:35;;;;:::i;10182:65::-;10131:15;::::0;::::1;::::0;;:21;-1:-1:-1;;;;;10115:38:60;;::::1;;::::0;;;:15:::1;:38;::::0;;;;;;;10154:12:::1;::::0;;;::::1;10115:52:::0;;;;;;;;:132;;;;10283:15;;:26:::1;;::::0;10272:49;;::::1;::::0;;;;;;;::::1;;:::i;:::-;10358:15;::::0;::::1;::::0;:21;;10381:22:::1;::::0;;::::1;::::0;10337:67;;10258:63;;-1:-1:-1;10337:67:60::1;::::0;::::1;::::0;10258:63;;10358:21;10337:67:::1;:::i;:::-;;;;;;;;10422:4;10415:11;;;;;2542:20:44::0;1857:1;3068:7;:21;2888:208;2542:20;9604:829:60;;;:::o;6911:575::-;7154:7;:14;7139:4;:11;:29;7131:79;;;;-1:-1:-1;;;7131:79:60;;23914:2:70;7131:79:60;;;23896:21:70;23953:2;23933:18;;;23926:30;23992:34;23972:18;;;23965:62;-1:-1:-1;;;24043:18:70;;;24036:35;24088:19;;7131:79:60;23712:401:70;7131:79:60;7228:4;:11;7243:1;7228:16;7220:58;;;;-1:-1:-1;;;7220:58:60;;24320:2:70;7220:58:60;;;24302:21:70;24359:2;24339:18;;;24332:30;24398:31;24378:18;;;24371:59;24447:18;;7220:58:60;24118:353:70;7220:58:60;7294:9;7289:123;7313:4;:11;7309:1;:15;7289:123;;;7345:56;7362:5;7369:3;7374:4;7379:1;7374:7;;;;;;;;:::i;:::-;;;;;;;7383;7391:1;7383:10;;;;;;;;:::i;:::-;;;;;;;7395:5;7345:16;:56::i;:::-;7326:3;;7289:123;;;;7460:3;-1:-1:-1;;;;;7427:52:60;7453:5;-1:-1:-1;;;;;7427:52:60;7441:10;-1:-1:-1;;;;;7427:52:60;;7465:4;7471:7;7427:52;;;;;;;:::i;:::-;;;;;;;;6911:575;;;;;:::o;10885:591::-;11006:37;11113:7;:14;11096:7;:14;:31;;;;:::i;:::-;-1:-1:-1;;;;;11071:57:60;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;;;;;;;;;;;;;;;;;;;;;;;;;11071:57:60;;-1:-1:-1;;11071:57:60;;;;;;;;;;;-1:-1:-1;11059:69:60;-1:-1:-1;11143:9:60;11138:305;11162:7;:14;11158:1;:18;11138:305;;;11212:220;;;;;;;;11256:7;11264:1;11256:10;;;;;;;;:::i;:::-;;;;;;;-1:-1:-1;;;;;11212:220:60;;;;;11291:7;11299:1;11291:10;;;;;;;;:::i;:::-;;;;;;;-1:-1:-1;;;;;11212:220:60;;;;;11328:33;11338:7;11346:1;11338:10;;;;;;;;:::i;:::-;;;;;;;11350:7;11358:1;11350:10;;;;;;;;:::i;:::-;;;;;;;11328:9;:33::i;:::-;11212:220;;;;11386:31;11394:7;11402:1;11394:10;;;;;;;;:::i;:::-;;;;;;;11406:7;11414:1;11406:10;;;;;;;;:::i;:::-;;;;;;;11386:7;:31::i;:::-;11212:220;;;11197:9;11207:1;11197:12;;;;;;;;:::i;:::-;;;;;;;;;;:235;11178:3;;11138:305;;;;10885:591;;;;:::o;3704:552:18:-;3828:16;3879:3;:10;3860:8;:15;:29;3856:121;;3938:10;;3950:15;;3912:54;;-1:-1:-1;;;3912:54:18;;;;;25425:25:70;;;;25466:18;;;25459:34;25398:18;;3912:54:18;25251:248:70;3856:121:18;3987:30;4034:8;:15;-1:-1:-1;;;;;4020:30:18;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;4020:30:18;-1:-1:-1;3987:63:18;-1:-1:-1;4066:9:18;4061:158;4085:8;:15;4081:1;:19;4061:158;;;16302:4:39;16293:14;;;16273:35;;;16267:42;4140:68:18;;16302:4:39;16293:14;;;16273:35;;;16267:42;5504:177:60;:::i;4140:68:18:-;4121:13;4135:1;4121:16;;;;;;;;:::i;:::-;;;;;;;;;;:87;4102:3;;4061:158;;;-1:-1:-1;4236:13:18;3704:552;-1:-1:-1;;;3704:552:18:o;4161:214:17:-;2655:13;:11;:13::i;:::-;4276:36:::1;4294:17;4276;:36::i;:::-;4322:46;4344:17;4363:4;4322:21;:46::i;:::-;4161:214:::0;;:::o;3708:134::-;3777:7;2926:20;:18;:20::i;:::-;-1:-1:-1;;;;;;;;;;;;3708:134:17;:::o;8837:735:60:-;8918:4;8942:7;8953:1;8942:12;8934:60;;;;-1:-1:-1;;;8934:60:60;;;;;;;:::i;:::-;9028:39;;-1:-1:-1;;;9028:39:60;;9061:4;9028:39;;;2766:51:70;9005:20:60;;-1:-1:-1;;;;;9028:24:60;;;;;2739:18:70;;9028:39:60;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;9005:62;-1:-1:-1;9077:67:60;-1:-1:-1;;;;;9077:31:60;;9109:10;9129:4;9136:7;9077:31;:67::i;:::-;9176:39;;-1:-1:-1;;;9176:39:60;;9209:4;9176:39;;;2766:51:70;9154:19:60;;-1:-1:-1;;;;;9176:24:60;;;;;2739:18:70;;9176:39:60;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;9154:61;-1:-1:-1;9263:7:60;9233:26;9247:12;9154:61;9233:26;:::i;:::-;:37;9225:78;;;;-1:-1:-1;;;9225:78:60;;26028:2:70;9225:78:60;;;26010:21:70;26067:2;26047:18;;;26040:30;26106;26086:18;;;26079:58;26154:18;;9225:78:60;25826:352:70;9225:78:60;-1:-1:-1;;;;;9374:23:60;;;9315:16;9374:23;;;:15;:23;;;;;;;;:28;;;;;;;;;;;;9315:16;;9351:52;;:22;:52::i;:::-;9314:89;;-1:-1:-1;9314:89:60;-1:-1:-1;9444:48:60;9465:18;9476:7;9314:89;9465:18;:::i;9444:48::-;-1:-1:-1;;;;;9413:23:60;;;;;;;:15;:23;;;;;;;;:28;;;;;;;;;;;:79;;;;9508:35;;;;;9437:3;;9429:6;;9535:7;;9508:35;:::i;:::-;;;;;;;;9561:4;9554:11;;;;;;8837:735;;;;;;:::o;7977:325::-;8061:4;8081:9;:14;8077:108;;8119:15;8130:3;8119:10;:15::i;:::-;8111:63;;;;-1:-1:-1;;;8111:63:60;;26385:2:70;8111:63:60;;;26367:21:70;26424:2;26404:18;;;26397:30;26463:34;26443:18;;;26436:62;-1:-1:-1;;;26514:18:70;;;26507:33;26557:19;;8111:63:60;26183:399:70;8111:63:60;8203:31;8213:3;8218:6;8226:7;8203:9;:31::i;:::-;8195:78;;;;-1:-1:-1;;;8195:78:60;;26789:2:70;8195:78:60;;;26771:21:70;26828:2;26808:18;;;26801:30;26867:34;26847:18;;;26840:62;-1:-1:-1;;;26918:18:70;;;26911:32;26960:19;;8195:78:60;26587:398:70;8195:78:60;-1:-1:-1;8291:4:60;7977:325;;;;;:::o;1619:862::-;1707:4;2334:13:15;:11;:13::i;:::-;1727:19:60;;-1:-1:-1;;;;;1727:33:60::1;::::0;1723:94:::1;;1787:19:::0;;1776:8:::1;:30:::0;;-1:-1:-1;;;;;;1776:30:60::1;-1:-1:-1::0;;;;;1776:30:60;;::::1;::::0;;;::::1;::::0;;1723:94:::1;1830:23;::::0;::::1;::::0;-1:-1:-1;;;;;1830:37:60::1;::::0;1826:106:::1;;1898:23;::::0;::::1;::::0;1883:12:::1;:38:::0;;-1:-1:-1;;;;;;1883:38:60::1;-1:-1:-1::0;;;;;1883:38:60;;::::1;::::0;;;::::1;::::0;;1826:106:::1;1945:21;::::0;::::1;::::0;-1:-1:-1;;;;;1945:35:60::1;::::0;1941:100:::1;;2009:21;::::0;::::1;::::0;1996:10:::1;:34:::0;;-1:-1:-1;;;;;;1996:34:60::1;-1:-1:-1::0;;;;;1996:34:60;;::::1;::::0;;;::::1;::::0;;1941:100:::1;2056:9;2051:364;2075:7;:32;;;:39;2071:1;:43;2051:364;;;2135:51;2189:7;:32;;;2222:1;2189:35;;;;;;;;:::i;:::-;;::::0;;::::1;::::0;;;;;;;2270:13;;::::1;::::0;2249:17;;2238:29:::1;::::0;;;:10:::1;:29:::0;;;;;:45;;;;;;;::::1;::::0;-1:-1:-1;;;;;2238:45:60::1;::::0;::::1;-1:-1:-1::0;;;;;;2238:45:60;;;::::1;::::0;;::::1;::::0;;;;::::1;::::0;;;2189:35;-1:-1:-1;2340:64:60::1;2238:45:::0;2340:12:::1;:64;:::i;:::-;2319:17:::0;;2297:40:::1;::::0;;;:21:::1;:40;::::0;;;;:107;2116:3:::1;;2051:364;;;;2430:22;2444:7;2430:22;;;;;;:::i;:::-;;;;;;;;-1:-1:-1::0;2470:4:60::1;1619:862:::0;;;:::o;3155:101:15:-;2334:13;:11;:13::i;:::-;3219:30:::1;3246:1;3219:18;:30::i;:::-;3155:101::o:0;13082:320:60:-;13301:14;;-1:-1:-1;;;;;13285:31:60;;;13212:13;13285:31;;;:15;:31;;;;;;;;:38;;;;;;;;;;;;13212:13;;13262:62;;:22;:62::i;:::-;13241:83;;;13362:13;13377:8;13387:6;13351:43;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;13341:54;;;;;;13334:61;;;13082:320;;;;:::o;1329:167::-;4158:30:16;4191:26;:24;:26::i;:::-;4302:15;;4158:59;;-1:-1:-1;4302:15:16;-1:-1:-1;;;4302:15:16;;;4301:16;;-1:-1:-1;;;;;4348:14:16;4279:19;4724:16;;:34;;;;;4744:14;4724:34;4704:54;;4768:17;4788:11;-1:-1:-1;;;;;4788:16:16;4803:1;4788:16;:50;;;;-1:-1:-1;4816:4:16;4808:25;:30;4788:50;4768:70;;4854:12;4853:13;:30;;;;;4871:12;4870:13;4853:30;4849:91;;;4906:23;;-1:-1:-1;;;4906:23:16;;;;;;;;;;;4849:91;4949:18;;-1:-1:-1;;4949:18:16;4966:1;4949:18;;;4977:67;;;;5011:22;;-1:-1:-1;;;;5011:22:16;-1:-1:-1;;;5011:22:16;;;4977:67;1380:26:60::1;1395:10;1380:14;:26::i;:::-;1416:24;:22;:24::i;:::-;1450:39;1465:23;;;;;;;;;;;;;-1:-1:-1::0;;;1465:23:60::1;;::::0;1450:14:::1;:39::i;:::-;5068:14:16::0;5064:101;;;5098:23;;-1:-1:-1;;;;5098:23:16;;;5140:14;;-1:-1:-1;29226:50:70;;5140:14:16;;29214:2:70;29199:18;5140:14:16;;;;;;;5064:101;4092:1079;;;;;1329:167:60:o;4324:144:18:-;4409:52;966:10:19;4442:8:18;4452;4409:18;:52::i;10465:202:60:-;10547:7;10578:21;;;:10;:21;;;;;:40;1796:8:68;;10578:50:60;;10621:7;;10578:40;;:50;:::i;:::-;10577:83;;;;:::i;:::-;10573:87;;:1;:87;:::i;13917:243::-;14063:13;14120;14135:8;14145:6;14109:43;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;14099:54;;;;;;14092:61;;13917:243;;;;:::o;2513:2772::-;20575:8;;2617:7;;-1:-1:-1;;;;;20575:8:60;20561:10;:22;20553:77;;;;-1:-1:-1;;;20553:77:60;;29711:2:70;20553:77:60;;;29693:21:70;29750:2;29730:18;;;29723:30;29789:34;29769:18;;;29762:62;-1:-1:-1;;;29840:18:70;;;29833:40;29890:19;;20553:77:60;29509:406:70;20553:77:60;2500:21:44::1;:19;:21::i;:::-;2636:24:60::2;::::0;;;2719:2526:::2;2743:8;:15;2739:1;:19;2719:2526;;;2852:8;2861:1;2852:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:25;;;2843:34;;2901:8;2910:1;2901:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:28;;;2891:38;;;;;:::i;:::-;;;2971:1;2953:8;:15;:19;;;;:::i;:::-;2948:1;:24;:90;;;;520:34:68;;;;;;30122:2:70::0;30104:21;;;30161:2;30141:18;;;30134:30;-1:-1:-1;;;30195:2:70;30180:18;;30173:50;30255:2;30240:18;;29920:344;520:34:68::2;;;;;;;;;;;;;510:45;;;;;;502:54;;2976:8:60;2985:1;2976:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:28;;;:62;2948:90;2944:690;;;-1:-1:-1::0;;;;;3209:23:60;;::::2;3150:16;3209:23:::0;;;:15:::2;:23;::::0;;;;;;;3233:12:::2;::::0;;;::::2;3209:37:::0;;;;;;;;;3150:16;;3186:61:::2;::::0;:22:::2;:61::i;:::-;3149:98:::0;;-1:-1:-1;3149:98:60;-1:-1:-1;3305:47:60::2;3326:17;3337:6:::0;3149:98;3326:17:::2;:::i;3305:47::-;-1:-1:-1::0;;;;;3265:23:60;;::::2;;::::0;;;:15:::2;:23;::::0;;;;;;;3289:12:::2;::::0;;;::::2;3265:37:::0;;;;;;:87;3380:11;;:8;;3389:1;;3380:11;::::2;;;;;:::i;:::-;;;;;;;:19;;;:25;;;3371:34;;3432:1;3423:10;;3479:1;3461:8;:15;:19;;;;:::i;:::-;3456:1;:24;3452:168;;3593:8;;;;3452:168;3040:594;;2944:690;3652:27;3667:8;3676:1;3667:11;;;;;;;;:::i;:::-;;;;;;;3652:14;:27::i;:::-;:35;;3683:4;3652:35:::0;3707:8:::2;3648:82;830:37:68;;;;;;30471:2:70::0;30453:21;;;30510:2;30490:18;;;30483:30;-1:-1:-1;;;30544:2:70;30529:18;;30522:53;30607:2;30592:18;;30269:347;830:37:68::2;;;;;;;;;;;;;820:48;;;;;;812:57;;3748:8:60;3757:1;3748:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:28;;;:65:::0;3744:1412:::2;;3841:32;3861:8;3870:1;3861:11;;;;;;;;:::i;:::-;;;;;;;3841:19;:32::i;:::-;3833:79;;;::::0;-1:-1:-1;;;3833:79:60;;30823:2:70;3833:79:60::2;::::0;::::2;30805:21:70::0;30862:2;30842:18;;;30835:30;30901:34;30881:18;;;30874:62;-1:-1:-1;;;30952:18:70;;;30945:32;30994:19;;3833:79:60::2;30621:398:70::0;3833:79:60::2;3744:1412;;;993:39:68;;;;;;22136:2:70::0;22118:21;;;22175:2;22155:18;;;22148:30;-1:-1:-1;;;22209:2:70;22194:18;;22187:55;22274:2;22259:18;;21934:349;993:39:68::2;;;;;;;;;;;;;983:50;;;;;;975:59;;3937:8:60;3946:1;3937:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:28;;;:67:::0;3933:1223:::2;;4032:34;4054:8;4063:1;4054:11;;;;;;;;:::i;:::-;;;;;;;4032:21;:34::i;:::-;4024:83;;;;-1:-1:-1::0;;;4024:83:60::2;;;;;;;:::i;3933:1223::-;4150:44;4165:8;4174:1;4165:11;;;;;;;;:::i;:::-;;;;;;;:19;;;:28;;;5381:4:::0;5404:32;;;:21;:32;;;;;;5440:12;-1:-1:-1;5404:48:60;;5317:142;4150:44:::2;:53;4205:8;4146:67;4232:16;4251:10;:40;4262:8;4271:1;4262:11;;;;;;;;:::i;:::-;;::::0;;::::2;::::0;;;;;;;:19:::2;;::::0;:28;::::2;::::0;4251:40;;;::::2;::::0;;;;;;-1:-1:-1;4251:40:60;:48;;;::::2;-1:-1:-1::0;;;;;4251:48:60::2;::::0;-1:-1:-1;4251:48:60;4317:64:::2;;;::::0;-1:-1:-1;;;4317:64:60;;31226:2:70;4317:64:60::2;::::0;::::2;31208:21:70::0;31265:2;31245:18;;;31238:30;31304:31;31284:18;;;31277:59;31353:18;;4317:64:60::2;31024:353:70::0;4317:64:60::2;-1:-1:-1::0;;;;;4450:23:60;::::2;4403:20;4450:23:::0;;;:15:::2;:23;::::0;;;;4474:11;;4427:65:::2;::::0;4450:23;4403:20;;4474:8;;4483:1;;4474:11;::::2;;;;;:::i;:::-;;;;;;;:16;;;-1:-1:-1::0;;;;;4450:41:60::2;-1:-1:-1::0;;;;;4450:41:60::2;;;;;;;;;;;;;4427:22;:65::i;:::-;4400:92;;;4512:13;4527:24;4555:8;-1:-1:-1::0;;;;;4555:21:60::2;4621:41;;;4664:8;4673:1;4664:11;;;;;;;;:::i;:::-;;;;;;;4598:78;;;;;;;;:::i;:::-;;::::0;;-1:-1:-1;;4598:78:60;;::::2;::::0;;;;;;::::2;::::0;::::2;::::0;;-1:-1:-1;;;;;4598:78:60::2;-1:-1:-1::0;;;;;;4598:78:60;;::::2;::::0;;;::::2;::::0;;;4555:139;;::::2;::::0;4598:78;4555:139:::2;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;4511:183;;;;4720:8;4712:61;;;::::0;-1:-1:-1;;;4712:61:60;;32526:2:70;4712:61:60::2;::::0;::::2;32508:21:70::0;32565:2;32545:18;;;32538:30;32604:34;32584:18;;;32577:62;-1:-1:-1;;;32655:18:70;;;32648:38;32703:19;;4712:61:60::2;32324:404:70::0;4712:61:60::2;4791:12;4817:11;4806:31;;;;;;;;;;;;:::i;:::-;4791:46;;4863:7;4855:63;;;::::0;-1:-1:-1;;;4855:63:60;;33185:2:70;4855:63:60::2;::::0;::::2;33167:21:70::0;33224:2;33204:18;;;33197:30;33263:34;33243:18;;;33236:62;-1:-1:-1;;;33314:18:70;;;33307:41;33365:19;;4855:63:60::2;32983:407:70::0;4855:63:60::2;-1:-1:-1::0;;;;;4986:23:60;::::2;4940:19;4986:23:::0;;;:15:::2;:23;::::0;;;;5010:11;;4963:65:::2;::::0;4986:23;4940:19;;5010:8;;5019:1;;5010:11;::::2;;;;;:::i;4963:65::-;4937:91:::0;-1:-1:-1;5070:16:60::2;::::0;-1:-1:-1;5070:12:60;5085:1:::2;5070:16;:::i;:::-;5055:11;:31;5047:94;;;::::0;-1:-1:-1;;;5047:94:60;;33597:2:70;5047:94:60::2;::::0;::::2;33579:21:70::0;33636:2;33616:18;;;33609:30;33675:34;33655:18;;;33648:62;-1:-1:-1;;;33726:18:70;;;33719:48;33784:19;;5047:94:60::2;33395:414:70::0;5047:94:60::2;4128:1028;;;;;;3933:1223;5170:18;::::0;::::2;:::i;:::-;;;5207:27;5222:8;5231:1;5222:11;;;;;;;;:::i;:::-;;;;;;;5207:27;;;;;;:::i;:::-;;;;;;;;2719:2526;2760:3;;2719:2526;;;-1:-1:-1::0;;1857:1:44;3068:7;:21;-1:-1:-1;5262:16:60;9604:829;-1:-1:-1;;9604:829:60:o;4535:216:18:-;-1:-1:-1;;;;;4705:29:18;;;4625:4;4705:29;;;:20;:29;;;;;;;;:39;;;;;;;;;;;;;;;4535:216::o;7750:195:60:-;-1:-1:-1;;;;;7883:23:60;;;7820:7;7883:23;;;:15;:23;;;;;;;;:31;;;;;;;;;;;;7820:7;;7860:55;;:22;:55::i;:::-;7839:76;7750:195;-1:-1:-1;;;;;7750:195:60:o;5726:1140::-;5897:35;5914:5;5921:10;5897:16;:35::i;:::-;:58;;;-1:-1:-1;5936:10:60;-1:-1:-1;;;;;5936:19:60;;;5897:58;5889:100;;;;-1:-1:-1;;;5889:100:60;;34156:2:70;5889:100:60;;;34138:21:70;34195:2;34175:18;;;34168:30;34234:31;34214:18;;;34207:59;34283:18;;5889:100:60;33954:353:70;5889:100:60;5999:14;6032:3;5999:38;;6047:12;6062:58;830:37:68;;;;;;30471:2:70;30453:21;;;30510:2;30490:18;;;30483:30;-1:-1:-1;;;30544:2:70;30529:18;;30522:53;30607:2;30592:18;;30269:347;830:37:68;;;;;;;;;;;;;820:48;;;;;;812:57;;6113:6:60;6062:15;:58::i;:::-;6047:73;-1:-1:-1;6130:21:60;6154:13;6047:73;6154:6;:13;:::i;:::-;6130:37;;6177:52;6200:6;6208:5;6215:13;6177:22;:52::i;:::-;-1:-1:-1;;;;;6300:23:60;;;6241:16;6300:23;;;:15;:23;;;;;;;;:30;;;;;;;;;;;;6241:16;;6277:54;;:22;:54::i;:::-;6240:91;;-1:-1:-1;6240:91:60;-1:-1:-1;6374:58:60;6395:24;6406:13;6240:91;6395:24;:::i;:::-;6421:10;:6;6430:1;6421:10;:::i;:::-;6374:20;:58::i;:::-;-1:-1:-1;;;;;6341:23:60;;;;;;;:15;:23;;;;;;;;:30;;;;;;;;;;;:91;;;;6487:28;;;;;;;6464:52;;:22;:52::i;:::-;6443:73;;-1:-1:-1;6443:73:60;-1:-1:-1;6557:47:60;6578:17;6589:6;6443:73;6578:17;:::i;6557:47::-;-1:-1:-1;;;;;6526:23:60;;;;;;;:15;:23;;;;;;;;:28;;;;;;;;;;;:78;;;;6683:12;;;;;6659:37;;;;6636:61;;:22;:61::i;:::-;6615:82;;-1:-1:-1;6615:82:60;-1:-1:-1;6747:45:60;6768:15;6779:4;6615:82;6768:15;:::i;6747:45::-;-1:-1:-1;;;;;6707:23:60;;;;;;;:15;:23;;;;;;;;6731:12;;;;6707:37;;;;;;;;:85;;;;6808:51;;25425:25:70;;;25466:18;;;25459:34;;;6808:51:60;;;;;;;;6823:10;;6808:51;;25398:18:70;6808:51:60;;;;;;;5879:987;;;;;5726:1140;;;;;:::o;3405:215:15:-;2334:13;:11;:13::i;:::-;-1:-1:-1;;;;;3489:22:15;::::1;3485:91;;3534:31;::::0;-1:-1:-1;;;3534:31:15;;3562:1:::1;3534:31;::::0;::::1;2766:51:70::0;2739:18;;3534:31:15::1;2620:203:70::0;3485:91:15::1;3585:28;3604:8;3585:18;:28::i;:::-;3405:215:::0;:::o;7518:200:60:-;-1:-1:-1;;;;;7654:23:60;;;7590:7;7654:23;;;:15;:23;;;;;;;;:31;;;;;;;;;;;;7590:7;;7631:55;;:22;:55::i;:::-;-1:-1:-1;7609:77:60;7518:200;-1:-1:-1;;;;7518:200:60:o;19338:232::-;19407:16;;2416:27:68;2442:1;-1:-1:-1;;;2416:27:68;:::i;:::-;2186:2;19460:37:60;;;19459:69;2667:25:68;2691:1;2668:19;2667:25;:::i;:::-;19451:112:60;;19530:32;;;19338:232;-1:-1:-1;;19338:232:60:o;18293:669::-;18380:15;2270:27:68;2296:1;-1:-1:-1;;;2270:27:68;:::i;:::-;18415:8:60;:38;;18407:84;;;;-1:-1:-1;;;18407:84:60;;34514:2:70;18407:84:60;;;34496:21:70;34553:2;34533:18;;;34526:30;34592:34;34572:18;;;34565:62;-1:-1:-1;;;34643:18:70;;;34636:31;34684:19;;18407:84:60;34312:397:70;18407:84:60;2551:1:68;2528:18;2551:1;2186:2;2528:18;:::i;:::-;2522:1;:25;;2521:31;;;;:::i;:::-;18509:6:60;:34;;18501:78;;;;-1:-1:-1;;;18501:78:60;;34916:2:70;18501:78:60;;;34898:21:70;34955:2;34935:18;;;34928:30;34994:33;34974:18;;;34967:61;35045:18;;18501:78:60;34714:355:70;18501:78:60;-1:-1:-1;2186:2:68;18608:41:60;;;18607:52;;18671:24;;18723:31;18607:52;18723:22;:31::i;:::-;18670:84;;;;18792:8;18772:16;:28;18764:81;;;;-1:-1:-1;;;18764:81:60;;35276:2:70;18764:81:60;;;35258:21:70;35315:2;35295:18;;;35288:30;35354:34;35334:18;;;35327:62;-1:-1:-1;;;35405:18:70;;;35398:38;35453:19;;18764:81:60;35074:404:70;18764:81:60;18881:6;18863:14;:24;18855:75;;;;-1:-1:-1;;;18855:75:60;;35685:2:70;18855:75:60;;;35667:21:70;35724:2;35704:18;;;35697:30;35763:34;35743:18;;;35736:62;-1:-1:-1;;;35814:18:70;;;35807:36;35860:19;;18855:75:60;35483:402:70;18855:75:60;18941:14;;18293:669;;;;:::o;2575:307:44:-;1899:1;2702:7;;:18;2698:86;;2743:30;;-1:-1:-1;;;2743:30:44;;;;;;;;;;;2698:86;1899:1;2858:7;:17;2575:307::o;11660:915:60:-;11741:13;11766:15;11784:181;11807:49;11826:7;:12;;;11840:7;:15;;;11807:18;:49::i;:::-;11870:7;:19;;;11903:7;:19;;;11936:7;:19;;;11784:181;;;;;;;;;;;;;;;;;36117:25:70;;;36190:4;36178:17;;;;36173:2;36158:18;;36151:45;36227:2;36212:18;;36205:34;36270:2;36255:18;;36248:34;36104:3;36089:19;;35890:398;11784:181:60;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;11784:181:60;;-1:-1:-1;;11784:181:60;;12011:12;;11784:181;;-1:-1:-1;;;;;;12000:23:60;;;;;;;-1:-1:-1;12000:23:60;12034:64;;;;-1:-1:-1;;;12034:64:60;;;;;;;:::i;:::-;12138:15;;;;;:21;;12163:12;-1:-1:-1;12138:37:60;12194:16;12186:64;;;;-1:-1:-1;;;12186:64:60;;;;;;;:::i;:::-;12261:33;12337:65;12353:7;:15;;;:24;;;12379:7;:15;;;:22;;;12337:15;:65::i;:::-;12309:7;:15;;;:24;;;:93;;12261:141;;12421:16;12413:64;;;;-1:-1:-1;;;12413:64:60;;;;;;;:::i;:::-;12495:16;:41;;;;;12515:21;12495:41;:73;;;;;12540:28;12495:73;12488:80;11660:915;-1:-1:-1;;;;;;11660:915:60:o;15921:1411::-;16004:13;16029:21;16080:7;:15;;;:22;;;16053:7;:15;;;:24;;;:49;;;;:::i;:::-;16135:15;;;;:21;16158:12;;16029:73;;-1:-1:-1;16112:74:60;;16029:73;16112:22;:74::i;:::-;16285:15;;;;:21;-1:-1:-1;;;;;16269:38:60;;;16198:16;16269:38;;;:15;:38;;;;;;;;16308:12;;16269:52;;;;;;;;;;;;16198:16;;16246:76;;:22;:76::i;:::-;16197:125;;-1:-1:-1;16197:125:60;-1:-1:-1;16399:58:60;16420:24;16431:13;16197:125;16420:24;:::i;16399:58::-;16348:15;;;;;:21;-1:-1:-1;;;;;16332:38:60;;;;;;;:15;:38;;;;;;;;16371:12;;16332:52;;;;;;;;;;;:125;;;;16493:15;;:26;;;16482:49;;;;;;;;;;;;:::i;:::-;16468:63;;16542:22;16574:21;1929:1:68;-1:-1:-1;;;;;16609:52:60;:7;:15;;;:21;;;-1:-1:-1;;;;;16609:52:60;;16605:544;;16749:15;;;;:22;;;;;16733:43;;-1:-1:-1;;;;;16694:11:60;;;;;-1:-1:-1;16694:11:60;16749:22;16733:43;;;;16749:22;16694:11;16733:43;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;16719:57;;;;;16798:8;16790:56;;;;-1:-1:-1;;;16790:56:60;;37109:2:70;16790:56:60;;;37091:21:70;37148:2;37128:18;;;37121:30;37187:34;37167:18;;;37160:62;-1:-1:-1;;;37238:18:70;;;37231:33;37281:19;;16790:56:60;36907:399:70;16790:56:60;-1:-1:-1;;;;;;16876:11:60;;;16605:544;;;16942:15;;;;:21;16935:44;;-1:-1:-1;;;16935:44:60;;-1:-1:-1;;;;;2784:32:70;;;16935:44:60;;;2766:51:70;16935:39:60;;;;;;2739:18:70;;16935:44:60;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;17041:15;;;;:22;;;;17000:21;;16918:61;;-1:-1:-1;16993:71:60;;-1:-1:-1;;;;;16993:42:60;;17036:3;;16993:42;:71::i;:::-;17101:15;;;;:21;17094:44;;-1:-1:-1;;;17094:44:60;;-1:-1:-1;;;;;2784:32:70;;;17094:44:60;;;2766:51:70;17094:39:60;;;;;;2739:18:70;;17094:44:60;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;17078:60;;16605:544;17212:14;17186:7;:15;;;:22;;;17170:13;:38;;;;:::i;:::-;:56;17159:67;;17244:8;17236:67;;;;-1:-1:-1;;;17236:67:60;;37513:2:70;17236:67:60;;;37495:21:70;37552:2;37532:18;;;37525:30;37591:34;37571:18;;;37564:62;-1:-1:-1;;;37642:18:70;;;37635:44;37696:19;;17236:67:60;37311:410:70;17236:67:60;-1:-1:-1;17321:4:60;;15921:1411;-1:-1:-1;;;;;;;15921:1411:60:o;4578:312:17:-;4658:4;-1:-1:-1;;;;;4667:6:17;4650:23;;;:120;;;4764:6;-1:-1:-1;;;;;4728:42:17;:32;-1:-1:-1;;;;;;;;;;;1519:53:29;-1:-1:-1;;;;;1519:53:29;;1441:138;4728:32:17;-1:-1:-1;;;;;4728:42:17;;;4650:120;4633:251;;;4844:29;;-1:-1:-1;;;4844:29:17;;;;;;;;;;;1502:85:60;2334:13:15;:11;:13::i;6032:538:17:-;6149:17;-1:-1:-1;;;;;6131:50:17;;:52;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;6131:52:17;;;;;;;;-1:-1:-1;;6131:52:17;;;;;;;;;;;;:::i;:::-;;;6127:437;;6493:60;;-1:-1:-1;;;6493:60:17;;-1:-1:-1;;;;;2784:32:70;;6493:60:17;;;2766:51:70;2739:18;;6493:60:17;2620:203:70;6127:437:17;-1:-1:-1;;;;;;;;;;;6225:40:17;;6221:120;;6292:34;;-1:-1:-1;;;6292:34:17;;;;;668:25:70;;;641:18;;6292:34:17;522:177:70;6221:120:17;6354:54;6384:17;6403:4;6354:29;:54::i;:::-;6184:235;6032:538;;:::o;5007:213::-;5081:4;-1:-1:-1;;;;;5090:6:17;5073:23;;5069:145;;5174:29;;-1:-1:-1;;;5174:29:17;;;;;;;;;;;1618:188:37;1718:81;1738:5;1760;-1:-1:-1;;;;;1760:18:37;;1781:4;1787:2;1791:5;1745:53;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;1745:53:37;;;;;;;;;;;1718:19;:81::i;:::-;1618:188;;;;:::o;2658:162:15:-;966:10:19;2717:7:15;1313:22;2570:8;-1:-1:-1;;;;;2570:8:15;;2441:144;2717:7;-1:-1:-1;;;;;2717:23:15;;2713:101;;2763:40;;-1:-1:-1;;;2763:40:15;;966:10:19;2763:40:15;;;2766:51:70;2739:18;;2763:40:15;2620:203:70;3774:248:15;1313:22;3923:8;;-1:-1:-1;;;;;;3941:19:15;;-1:-1:-1;;;;;3941:19:15;;;;;;;;3975:40;;3923:8;;;;;3975:40;;3847:24;;3975:40;3837:185;;3774:248;:::o;9071:205:16:-;9129:30;;3147:66;9186:27;8819:122;1847:127:15;6929:20:16;:18;:20::i;:::-;1929:38:15::1;1954:12;1929:24;:38::i;2970:67:17:-:0;6929:20:16;:18;:20::i;2119:117:18:-;6929:20:16;:18;:20::i;:::-;2199:30:18::1;2224:4;2199:24;:30::i;14627:374::-:0;2032:22;-1:-1:-1;;;;;14791:22:18;;14787:94;;14836:34;;-1:-1:-1;;;14836:34:18;;14867:1;14836:34;;;2766:51:70;2739:18;;14836:34:18;2620:203:70;14787:94:18;-1:-1:-1;;;;;14890:27:18;;;;;;;:20;;;:27;;;;;;;;:37;;;;;;;;;;;;;:48;;-1:-1:-1;;14890:48:18;;;;;;;;;;14953:41;;1135::70;;;14953::18;;1108:18:70;14953:41:18;;;;;;;14720:281;14627:374;;;:::o;14606:855:60:-;14687:13;14712:21;14763:7;:15;;;:22;;;14736:7;:15;;;:24;;;:49;;;;:::i;:::-;14818:15;;;;:21;14841:12;;14712:73;;-1:-1:-1;14795:74:60;;14712:73;14795:22;:74::i;:::-;14968:15;;;;:21;-1:-1:-1;;;;;14952:38:60;;;14881:16;14952:38;;;:15;:38;;;;;;;;14991:12;;14952:52;;;;;;;;;;;;14881:16;;14929:76;;:22;:76::i;:::-;14880:125;;-1:-1:-1;14880:125:60;-1:-1:-1;15082:58:60;15103:24;15114:13;14880:125;15103:24;:::i;15082:58::-;15031:15;;;;;:21;-1:-1:-1;;;;;15015:38:60;;;;;;;:15;:38;;;;;;;;15054:12;;15015:52;;;;;;;;;;;:125;;;;15176:15;;:26;;;15165:49;;;;;;;;;;;;:::i;:::-;15285:15;;;;:21;-1:-1:-1;;;;;15269:38:60;;;;;;;:15;:38;;;;;;;;:43;;;;;;;;;;15151:63;;-1:-1:-1;15246:67:60;;:22;:67::i;:::-;15401:15;;;;:22;;;15225:88;;-1:-1:-1;15225:88:60;-1:-1:-1;15369:63:60;;15390:33;;15225:88;15390:33;:::i;:::-;15425:6;15369:20;:63::i;:::-;15339:15;;;;;:21;-1:-1:-1;;;;;15323:38:60;;;;;;;:15;:38;;;;;;;;:43;;;;;;;;;;;;:109;;;;-1:-1:-1;15450:4:60;;14606:855;-1:-1:-1;;;14606:855:60:o;17677:271::-;-1:-1:-1;;;;;17826:23:60;;;17782:16;17826:23;;;:15;:23;;;;;;;;:30;;;;;;;;;;;;17803:54;;:22;:54::i;:::-;17781:76;;;17887:7;17875:8;:19;;17867:74;;;;-1:-1:-1;;;17867:74:60;;38117:2:70;17867:74:60;;;38099:21:70;38156:2;38136:18;;;38129:30;38195:34;38175:18;;;38168:62;-1:-1:-1;;;38246:18:70;;;38239:40;38296:19;;17867:74:60;37915:406:70;1219:160:37;1328:43;;-1:-1:-1;;;;;38518:32:70;;;1328:43:37;;;38500:51:70;38567:18;;;38560:34;;;1301:71:37;;1321:5;;1343:14;;;;;38473:18:70;;1328:43:37;38326:274:70;2264:344:29;2355:37;2374:17;2355:18;:37::i;:::-;2407:36;;-1:-1:-1;;;;;2407:36:29;;;;;;;;2458:11;;:15;2454:148;;2489:53;2518:17;2537:4;2489:28;:53::i;2454:148::-;2573:18;:16;:18::i;8370:720:37:-;8450:18;8478:19;8616:4;8613:1;8606:4;8600:11;8593:4;8587;8583:15;8580:1;8573:5;8566;8561:60;8673:7;8663:176;;8717:4;8711:11;8762:16;8759:1;8754:3;8739:40;8808:16;8803:3;8796:29;8663:176;-1:-1:-1;;8916:1:37;8910:8;8866:16;;-1:-1:-1;8942:15:37;;:68;;8994:11;9009:1;8994:16;;8942:68;;;-1:-1:-1;;;;;8960:26:37;;;:31;8942:68;8938:146;;;9033:40;;-1:-1:-1;;;9033:40:37;;-1:-1:-1;;;;;2784:32:70;;9033:40:37;;;2766:51:70;2739:18;;9033:40:37;2620:203:70;7082:141:16;7149:17;:15;:17::i;:::-;7144:73;;7189:17;;-1:-1:-1;;;7189:17:16;;;;;;;;;;;1980:235:15;6929:20:16;:18;:20::i;2242:110:18:-;6929:20:16;:18;:20::i;:::-;2332:13:18::1;2340:4;2332:7;:13::i;1671:281:29:-:0;1748:17;-1:-1:-1;;;;;1748:29:29;;1781:1;1748:34;1744:119;;1805:47;;-1:-1:-1;;;1805:47:29;;-1:-1:-1;;;;;2784:32:70;;1805:47:29;;;2766:51:70;2739:18;;1805:47:29;2620:203:70;1744:119:29;-1:-1:-1;;;;;;;;;;;1872:73:29;;-1:-1:-1;;;;;;1872:73:29;-1:-1:-1;;;;;1872:73:29;;;;;;;;;;1671:281::o;3916:253:38:-;3999:12;4024;4038:23;4065:6;-1:-1:-1;;;;;4065:19:38;4085:4;4065:25;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;4023:67;;;;4107:55;4134:6;4142:7;4151:10;4107:26;:55::i;6113:122:29:-;6163:9;:13;6159:70;;6199:19;;-1:-1:-1;;;6199:19:29;;;;;;;;;;;8485:120:16;8535:4;8558:26;:24;:26::i;:::-;:40;-1:-1:-1;;;8558:40:16;;;;;;-1:-1:-1;8485:120:16:o;11582:145:18:-;2032:22;11705:6;:15;11714:6;11705;:15;:::i;4437:582:38:-;4581:12;4610:7;4605:408;;4633:19;4641:10;4633:7;:19::i;:::-;4605:408;;;4857:17;;:22;:49;;;;-1:-1:-1;;;;;;4883:18:38;;;:23;4857:49;4853:119;;;4933:24;;-1:-1:-1;;;4933:24:38;;-1:-1:-1;;;;;2784:32:70;;4933:24:38;;;2766:51:70;2739:18;;4933:24:38;2620:203:70;4853:119:38;-1:-1:-1;4992:10:38;4985:17;;5559:487;5690:17;;:21;5686:354;;5887:10;5881:17;5943:15;5930:10;5926:2;5922:19;5915:44;5686:354;6010:19;;-1:-1:-1;;;6010:19:38;;;;;;;;;;;14:131:70;-1:-1:-1;;;;;89:31:70;;79:42;;69:70;;135:1;132;125:12;150:367;218:6;226;279:2;267:9;258:7;254:23;250:32;247:52;;;295:1;292;285:12;247:52;334:9;321:23;353:31;378:5;353:31;:::i;:::-;403:5;481:2;466:18;;;;453:32;;-1:-1:-1;;;150:367:70:o;704:286::-;762:6;815:2;803:9;794:7;790:23;786:32;783:52;;;831:1;828;821:12;783:52;857:23;;-1:-1:-1;;;;;;909:32:70;;899:43;;889:71;;956:1;953;946:12;1187:388;1255:6;1263;1316:2;1304:9;1295:7;1291:23;1287:32;1284:52;;;1332:1;1329;1322:12;1284:52;1371:9;1358:23;1390:31;1415:5;1390:31;:::i;:::-;1440:5;-1:-1:-1;1497:2:70;1482:18;;1469:32;1510:33;1469:32;1510:33;:::i;:::-;1562:7;1552:17;;;1187:388;;;;;:::o;1580:226::-;1639:6;1692:2;1680:9;1671:7;1667:23;1663:32;1660:52;;;1708:1;1705;1698:12;1660:52;-1:-1:-1;1753:23:70;;1580:226;-1:-1:-1;1580:226:70:o;1811:289::-;1853:3;1891:5;1885:12;1918:6;1913:3;1906:19;1974:6;1967:4;1960:5;1956:16;1949:4;1944:3;1940:14;1934:47;2026:1;2019:4;2010:6;2005:3;2001:16;1997:27;1990:38;2089:4;2082:2;2078:7;2073:2;2065:6;2061:15;2057:29;2052:3;2048:39;2044:50;2037:57;;;1811:289;;;;:::o;2105:220::-;2254:2;2243:9;2236:21;2217:4;2274:45;2315:2;2304:9;2300:18;2292:6;2274:45;:::i;2828:247::-;2887:6;2940:2;2928:9;2919:7;2915:23;2911:32;2908:52;;;2956:1;2953;2946:12;2908:52;2995:9;2982:23;3014:31;3039:5;3014:31;:::i;3080:127::-;3141:10;3136:3;3132:20;3129:1;3122:31;3172:4;3169:1;3162:15;3196:4;3193:1;3186:15;3212:253;3284:2;3278:9;3326:4;3314:17;;-1:-1:-1;;;;;3346:34:70;;3382:22;;;3343:62;3340:88;;;3408:18;;:::i;:::-;3444:2;3437:22;3212:253;:::o;3470:::-;3542:2;3536:9;3584:4;3572:17;;-1:-1:-1;;;;;3604:34:70;;3640:22;;;3601:62;3598:88;;;3666:18;;:::i;3728:253::-;3800:2;3794:9;3842:4;3830:17;;-1:-1:-1;;;;;3862:34:70;;3898:22;;;3859:62;3856:88;;;3924:18;;:::i;3986:251::-;4058:2;4052:9;;;4088:15;;-1:-1:-1;;;;;4118:34:70;;4154:22;;;4115:62;4112:88;;;4180:18;;:::i;4242:275::-;4313:2;4307:9;4378:2;4359:13;;-1:-1:-1;;4355:27:70;4343:40;;-1:-1:-1;;;;;4398:34:70;;4434:22;;;4395:62;4392:88;;;4460:18;;:::i;:::-;4496:2;4489:22;4242:275;;-1:-1:-1;4242:275:70:o;4522:558::-;4564:5;4617:3;4610:4;4602:6;4598:17;4594:27;4584:55;;4635:1;4632;4625:12;4584:55;4675:6;4662:20;-1:-1:-1;;;;;4697:6:70;4694:30;4691:56;;;4727:18;;:::i;:::-;4771:59;4818:2;4795:17;;-1:-1:-1;;4791:31:70;4824:4;4787:42;4771:59;:::i;:::-;4855:6;4846:7;4839:23;4909:3;4902:4;4893:6;4885;4881:19;4877:30;4874:39;4871:59;;;4926:1;4923;4916:12;4871:59;4991:6;4984:4;4976:6;4972:17;4965:4;4956:7;4952:18;4939:59;5047:1;5018:20;;;5040:4;5014:31;5007:42;;;;5022:7;4522:558;-1:-1:-1;;;4522:558:70:o;5085:960::-;5145:5;5193:4;5181:9;5176:3;5172:19;5168:30;5165:50;;;5211:1;5208;5201:12;5165:50;5233:22;;:::i;:::-;5224:31;;5292:9;5279:23;5311:33;5336:7;5311:33;:::i;:::-;5353:22;;5448:2;5433:18;;;5420:32;5468:14;;;5461:31;5565:2;5550:18;;;5537:32;5585:14;;;5578:31;5682:2;5667:18;;;5654:32;5702:14;;;5695:31;5799:3;5784:19;;;5771:33;5820:15;;;5813:32;5896:3;5881:19;;5868:33;-1:-1:-1;;;;;5913:30:70;;5910:50;;;5956:1;5953;5946:12;5910:50;5993:45;6034:3;6025:6;6014:9;6010:22;5993:45;:::i;:::-;5987:3;5980:5;5976:15;5969:70;;5085:960;;;;:::o;6050:896::-;6103:5;6151:4;6139:9;6134:3;6130:19;6126:30;6123:50;;;6169:1;6166;6159:12;6123:50;6191:22;;:::i;:::-;6182:31;;6250:9;6237:23;6269:33;6294:7;6269:33;:::i;:::-;6311:22;;6385:2;6370:18;;6357:32;6433:4;6420:18;;6408:31;;6398:59;;6453:1;6450;6443:12;6398:59;6484:2;6473:14;;6466:31;6570:2;6555:18;;;6542:32;6590:14;;;6583:31;6687:2;6672:18;;;6659:32;6707:14;;;6700:31;6782:3;6767:19;;6754:33;-1:-1:-1;;;;;6799:30:70;;6796:50;;;6842:1;6839;6832:12;6796:50;6879:60;6935:3;6926:6;6915:9;6911:22;6879:60;:::i;:::-;6873:3;6866:5;6862:15;6855:85;;6050:896;;;;:::o;6951:344::-;7035:6;7088:2;7076:9;7067:7;7063:23;7059:32;7056:52;;;7104:1;7101;7094:12;7056:52;7144:9;7131:23;-1:-1:-1;;;;;7169:6:70;7166:30;7163:50;;;7209:1;7206;7199:12;7163:50;7232:57;7281:7;7272:6;7261:9;7257:22;7232:57;:::i;:::-;7222:67;6951:344;-1:-1:-1;;;;6951:344:70:o;7300:183::-;7360:4;-1:-1:-1;;;;;7385:6:70;7382:30;7379:56;;;7415:18;;:::i;:::-;-1:-1:-1;7460:1:70;7456:14;7472:4;7452:25;;7300:183::o;7488:723::-;7542:5;7595:3;7588:4;7580:6;7576:17;7572:27;7562:55;;7613:1;7610;7603:12;7562:55;7653:6;7640:20;7680:64;7696:47;7736:6;7696:47;:::i;:::-;7680:64;:::i;:::-;7768:3;7792:6;7787:3;7780:19;7824:4;7819:3;7815:14;7808:21;;7885:4;7875:6;7872:1;7868:14;7860:6;7856:27;7852:38;7838:52;;7913:3;7905:6;7902:15;7899:35;;;7930:1;7927;7920:12;7899:35;7966:4;7958:6;7954:17;7980:200;7996:6;7991:3;7988:15;7980:200;;;8088:17;;8118:18;;8165:4;8156:14;;;;8013;7980:200;;;-1:-1:-1;8198:7:70;7488:723;-1:-1:-1;;;;;7488:723:70:o;8216:1082::-;8370:6;8378;8386;8394;8402;8455:3;8443:9;8434:7;8430:23;8426:33;8423:53;;;8472:1;8469;8462:12;8423:53;8511:9;8498:23;8530:31;8555:5;8530:31;:::i;:::-;8580:5;-1:-1:-1;8637:2:70;8622:18;;8609:32;8650:33;8609:32;8650:33;:::i;:::-;8702:7;-1:-1:-1;8760:2:70;8745:18;;8732:32;-1:-1:-1;;;;;8776:30:70;;8773:50;;;8819:1;8816;8809:12;8773:50;8842:61;8895:7;8886:6;8875:9;8871:22;8842:61;:::i;:::-;8832:71;;;8956:2;8945:9;8941:18;8928:32;-1:-1:-1;;;;;8975:8:70;8972:32;8969:52;;;9017:1;9014;9007:12;8969:52;9040:63;9095:7;9084:8;9073:9;9069:24;9040:63;:::i;:::-;9030:73;;;9156:3;9145:9;9141:19;9128:33;-1:-1:-1;;;;;9176:8:70;9173:32;9170:52;;;9218:1;9215;9208:12;9170:52;9241:51;9284:7;9273:8;9262:9;9258:24;9241:51;:::i;:::-;9231:61;;;8216:1082;;;;;;;;:::o;9303:744::-;9357:5;9410:3;9403:4;9395:6;9391:17;9387:27;9377:55;;9428:1;9425;9418:12;9377:55;9468:6;9455:20;9495:64;9511:47;9551:6;9511:47;:::i;9495:64::-;9583:3;9607:6;9602:3;9595:19;9639:4;9634:3;9630:14;9623:21;;9700:4;9690:6;9687:1;9683:14;9675:6;9671:27;9667:38;9653:52;;9728:3;9720:6;9717:15;9714:35;;;9745:1;9742;9735:12;9714:35;9781:4;9773:6;9769:17;9795:221;9811:6;9806:3;9803:15;9795:221;;;9893:3;9880:17;9910:31;9935:5;9910:31;:::i;:::-;9954:18;;10001:4;9992:14;;;;9828;9795:221;;10052:590;10170:6;10178;10231:2;10219:9;10210:7;10206:23;10202:32;10199:52;;;10247:1;10244;10237:12;10199:52;10287:9;10274:23;-1:-1:-1;;;;;10312:6:70;10309:30;10306:50;;;10352:1;10349;10342:12;10306:50;10375:61;10428:7;10419:6;10408:9;10404:22;10375:61;:::i;:::-;10365:71;;;10489:2;10478:9;10474:18;10461:32;-1:-1:-1;;;;;10508:8:70;10505:32;10502:52;;;10550:1;10547;10540:12;10502:52;10573:63;10628:7;10617:8;10606:9;10602:24;10573:63;:::i;:::-;10563:73;;;10052:590;;;;;:::o;10647:912::-;10889:2;10901:21;;;10971:13;;10874:18;;;10993:22;;;10841:4;;11072:15;;;11046:2;11031:18;;;10841:4;11115:418;11129:6;11126:1;11123:13;11115:418;;;11188:13;;11230:9;;-1:-1:-1;;;;;11226:35:70;;;11214:48;;11314:2;11306:11;;;11300:18;11296:44;;;11282:12;;;11275:66;11389:2;11381:11;;;11375:18;11361:12;;;11354:40;11444:4;11436:13;;;11430:20;11414:14;;;11407:44;;;;11508:15;;;;11480:4;11471:14;;;;11258:1;11144:9;11115:418;;;-1:-1:-1;11550:3:70;;10647:912;-1:-1:-1;;;;;10647:912:70:o;11564:590::-;11682:6;11690;11743:2;11731:9;11722:7;11718:23;11714:32;11711:52;;;11759:1;11756;11749:12;11711:52;11799:9;11786:23;-1:-1:-1;;;;;11824:6:70;11821:30;11818:50;;;11864:1;11861;11854:12;11818:50;11887:61;11940:7;11931:6;11920:9;11916:22;11887:61;:::i;:::-;11877:71;;;12001:2;11990:9;11986:18;11973:32;-1:-1:-1;;;;;12020:8:70;12017:32;12014:52;;;12062:1;12059;12052:12;12014:52;12085:63;12140:7;12129:8;12118:9;12114:24;12085:63;:::i;12159:420::-;12212:3;12250:5;12244:12;12277:6;12272:3;12265:19;12309:4;12304:3;12300:14;12293:21;;12348:4;12341:5;12337:16;12371:1;12381:173;12395:6;12392:1;12389:13;12381:173;;;12456:13;;12444:26;;12499:4;12490:14;;;;12527:17;;;;12417:1;12410:9;12381:173;;;-1:-1:-1;12570:3:70;;12159:420;-1:-1:-1;;;;12159:420:70:o;12584:261::-;12763:2;12752:9;12745:21;12726:4;12783:56;12835:2;12824:9;12820:18;12812:6;12783:56;:::i;12850:455::-;12927:6;12935;12988:2;12976:9;12967:7;12963:23;12959:32;12956:52;;;13004:1;13001;12994:12;12956:52;13043:9;13030:23;13062:31;13087:5;13062:31;:::i;:::-;13112:5;-1:-1:-1;13168:2:70;13153:18;;13140:32;-1:-1:-1;;;;;13184:30:70;;13181:50;;;13227:1;13224;13217:12;13181:50;13250:49;13291:7;13282:6;13271:9;13267:22;13250:49;:::i;13492:508::-;13569:6;13577;13585;13638:2;13626:9;13617:7;13613:23;13609:32;13606:52;;;13654:1;13651;13644:12;13606:52;13693:9;13680:23;13712:31;13737:5;13712:31;:::i;:::-;13762:5;-1:-1:-1;13819:2:70;13804:18;;13791:32;13832:33;13791:32;13832:33;:::i;:::-;13492:508;;13884:7;;-1:-1:-1;;;13964:2:70;13949:18;;;;13936:32;;13492:508::o;14005:2249::-;14095:6;14148:2;14136:9;14127:7;14123:23;14119:32;14116:52;;;14164:1;14161;14154:12;14116:52;14204:9;14191:23;-1:-1:-1;;;;;14229:6:70;14226:30;14223:50;;;14269:1;14266;14259:12;14223:50;14292:22;;14348:4;14330:16;;;14326:27;14323:47;;;14366:1;14363;14356:12;14323:47;14392:22;;:::i;:::-;14451:2;14438:16;14463:33;14488:7;14463:33;:::i;:::-;14505:22;;14572:2;14564:11;;14551:25;14585:33;14551:25;14585:33;:::i;:::-;14645:2;14634:14;;14627:31;14703:2;14695:11;;14682:25;14716:33;14682:25;14716:33;:::i;:::-;14776:2;14765:14;;14758:31;14835:2;14827:11;;14814:25;-1:-1:-1;;;;;14851:32:70;;14848:52;;;14896:1;14893;14886:12;14848:52;14927:8;14923:2;14919:17;14909:27;;;14974:7;14967:4;14963:2;14959:13;14955:27;14945:55;;14996:1;14993;14986:12;14945:55;15036:2;15023:16;15059:64;15075:47;15115:6;15075:47;:::i;15059:64::-;15145:3;15169:6;15164:3;15157:19;15201:2;15196:3;15192:12;15185:19;;15257:2;15251;15243:6;15239:15;15235:2;15231:24;15227:33;15213:47;;15283:7;15275:6;15272:19;15269:39;;;15304:1;15301;15294:12;15269:39;15336:2;15332;15328:11;15317:22;;15348:838;15364:6;15359:3;15356:15;15348:838;;;15441:3;15432:7;15428:17;15469:2;15465;15461:11;15458:31;;;15485:1;15482;15475:12;15458:31;15517:22;;:::i;:::-;15592:17;;15622:24;;15684:2;-1:-1:-1;;15666:16:70;;15662:25;15659:45;;;15700:1;15697;15690:12;15659:45;15732:22;;:::i;:::-;15717:37;;15804:2;15799:3;15795:12;15782:26;15856:6;15847:7;15843:20;15834:7;15831:33;15821:61;;15878:1;15875;15868:12;15821:61;15895:24;;15969:2;15960:12;;15947:26;15986:33;15947:26;15986:33;:::i;:::-;16057:7;16052:2;16043:7;16039:16;16032:33;;16103:7;16098:2;16089:7;16085:16;16078:33;16136:7;16131:3;16124:20;;;16173:2;16168:3;16164:12;16157:19;;15390:2;15385:3;15381:12;15374:19;;15348:838;;;16213:2;16202:14;;16195:29;-1:-1:-1;16206:5:70;;14005:2249;-1:-1:-1;;;;;14005:2249:70:o;16259:493::-;16359:6;16367;16420:2;16408:9;16399:7;16395:23;16391:32;16388:52;;;16436:1;16433;16426:12;16388:52;16475:9;16462:23;16494:31;16519:5;16494:31;:::i;:::-;16544:5;-1:-1:-1;16600:2:70;16585:18;;16572:32;-1:-1:-1;;;;;16616:30:70;;16613:50;;;16659:1;16656;16649:12;16613:50;16682:64;16738:7;16729:6;16718:9;16714:22;16682:64;:::i;16757:118::-;16843:5;16836:13;16829:21;16822:5;16819:32;16809:60;;16865:1;16862;16855:12;16880:382;16945:6;16953;17006:2;16994:9;16985:7;16981:23;16977:32;16974:52;;;17022:1;17019;17012:12;16974:52;17061:9;17048:23;17080:31;17105:5;17080:31;:::i;:::-;17130:5;-1:-1:-1;17187:2:70;17172:18;;17159:32;17200:30;17159:32;17200:30;:::i;17267:346::-;17335:6;17343;17396:2;17384:9;17375:7;17371:23;17367:32;17364:52;;;17412:1;17409;17402:12;17364:52;-1:-1:-1;;17457:23:70;;;17577:2;17562:18;;;17549:32;;-1:-1:-1;17267:346:70:o;17618:472::-;17718:6;17726;17779:2;17767:9;17758:7;17754:23;17750:32;17747:52;;;17795:1;17792;17785:12;17747:52;17835:9;17822:23;-1:-1:-1;;;;;17860:6:70;17857:30;17854:50;;;17900:1;17897;17890:12;17854:50;17923:64;17979:7;17970:6;17959:9;17955:22;17923:64;:::i;:::-;17913:74;18056:2;18041:18;;;;18028:32;;-1:-1:-1;;;;17618:472:70:o;18095:1075::-;18204:6;18257:2;18245:9;18236:7;18232:23;18228:32;18225:52;;;18273:1;18270;18263:12;18225:52;18313:9;18300:23;-1:-1:-1;;;;;18338:6:70;18335:30;18332:50;;;18378:1;18375;18368:12;18332:50;18401:22;;18454:4;18446:13;;18442:27;-1:-1:-1;18432:55:70;;18483:1;18480;18473:12;18432:55;18523:2;18510:16;18546:64;18562:47;18602:6;18562:47;:::i;18546:64::-;18632:3;18656:6;18651:3;18644:19;18688:2;18683:3;18679:12;18672:19;;18743:2;18733:6;18730:1;18726:14;18722:2;18718:23;18714:32;18700:46;;18769:7;18761:6;18758:19;18755:39;;;18790:1;18787;18780:12;18755:39;18822:2;18818;18814:11;18834:306;18850:6;18845:3;18842:15;18834:306;;;18936:3;18923:17;-1:-1:-1;;;;;18959:11:70;18956:35;18953:55;;;19004:1;19001;18994:12;18953:55;19033:64;19089:7;19084:2;19070:11;19066:2;19062:20;19058:29;19033:64;:::i;:::-;19021:77;;-1:-1:-1;19127:2:70;19118:12;;;;18867;18834:306;;;-1:-1:-1;19159:5:70;18095:1075;-1:-1:-1;;;;;;18095:1075:70:o;19378:281::-;19263:12;;19277:6;19259:25;19247:38;;19338:4;19327:16;;;19321:23;-1:-1:-1;;;;;19317:49:70;19301:14;;;19294:73;19586:2;19571:18;;19598:55;19175:198;19664:838;19768:6;19776;19784;19792;19800;19853:3;19841:9;19832:7;19828:23;19824:33;19821:53;;;19870:1;19867;19860:12;19821:53;19909:9;19896:23;19928:31;19953:5;19928:31;:::i;:::-;19978:5;-1:-1:-1;20035:2:70;20020:18;;20007:32;20048:33;20007:32;20048:33;:::i;:::-;20100:7;-1:-1:-1;20180:2:70;20165:18;;20152:32;;-1:-1:-1;20283:2:70;20268:18;;20255:32;;-1:-1:-1;20364:3:70;20349:19;;20336:33;-1:-1:-1;;;;;20381:30:70;;20378:50;;;20424:1;20421;20414:12;20507:380;20586:1;20582:12;;;;20629;;;20650:61;;20704:4;20696:6;20692:17;20682:27;;20650:61;20757:2;20749:6;20746:14;20726:18;20723:38;20720:161;;20803:10;20798:3;20794:20;20791:1;20784:31;20838:4;20835:1;20828:15;20866:4;20863:1;20856:15;20720:161;;20507:380;;;:::o;20892:399::-;21094:2;21076:21;;;21133:2;21113:18;;;21106:30;21172:34;21167:2;21152:18;;21145:62;-1:-1:-1;;;21238:2:70;21223:18;;21216:33;21281:3;21266:19;;20892:399::o;21296:127::-;21357:10;21352:3;21348:20;21345:1;21338:31;21388:4;21385:1;21378:15;21412:4;21409:1;21402:15;21428:125;21493:9;;;21514:10;;;21511:36;;;21527:18;;:::i;21558:371::-;-1:-1:-1;;;;;21778:32:70;;;21760:51;;21847:32;;;;21842:2;21827:18;;21820:60;21911:2;21896:18;;21889:34;;;;21748:2;21733:18;;21558:371::o;23043:400::-;23245:2;23227:21;;;23284:2;23264:18;;;23257:30;23323:34;23318:2;23303:18;;23296:62;-1:-1:-1;;;23389:2:70;23374:18;;23367:34;23433:3;23418:19;;23043:400::o;23448:259::-;23526:6;23579:2;23567:9;23558:7;23554:23;23550:32;23547:52;;;23595:1;23592;23585:12;23547:52;23627:9;23621:16;23646:31;23671:5;23646:31;:::i;24476:127::-;24537:10;24532:3;24528:20;24525:1;24518:31;24568:4;24565:1;24558:15;24592:4;24589:1;24582:15;24608:465;24865:2;24854:9;24847:21;24828:4;24891:56;24943:2;24932:9;24928:18;24920:6;24891:56;:::i;:::-;24995:9;24987:6;24983:22;24978:2;24967:9;24963:18;24956:50;25023:44;25060:6;25052;25023:44;:::i;25078:168::-;25151:9;;;25182;;25199:15;;;25193:22;;25179:37;25169:71;;25220:18;;:::i;25504:184::-;25574:6;25627:2;25615:9;25606:7;25602:23;25598:32;25595:52;;;25643:1;25640;25633:12;25595:52;-1:-1:-1;25666:16:70;;25504:184;-1:-1:-1;25504:184:70:o;25693:128::-;25760:9;;;25781:11;;;25778:37;;;25795:18;;:::i;26990:1141::-;27181:2;27163:21;;;27266:13;;-1:-1:-1;;;;;27262:39:70;;;27242:18;;;27235:67;27348:15;;;27342:22;27338:48;;27333:2;27318:18;;;27311:76;;;;27433:15;;27427:22;27423:48;27418:2;27403:18;;;27396:76;;;;27507:15;;27501:22;27561:4;27539:20;;;27532:34;27615:19;;27222:3;27207:19;;27643:22;;;27144:4;;27723:21;;;;;27144:4;;27696:3;27681:19;;;27772:333;27786:6;27783:1;27780:13;27772:333;;;27845:13;;27883:9;;27871:22;;27942:2;27934:11;;;27928:18;19263:12;;19277:6;19259:25;28012:12;;;19247:38;19327:16;;19321:23;-1:-1:-1;;;;;19317:49:70;19301:14;;;19294:73;28080:15;;;;27808:1;27801:9;;;;;28054:2;28045:12;;;;27772:333;;28136:507;28257:1;28253;28248:3;28244:11;28240:19;28232:5;28226:12;28222:38;28217:3;28210:51;28310:4;28303:5;28299:16;28293:23;28286:4;28281:3;28277:14;28270:47;28366:4;28359:5;28355:16;28349:23;28342:4;28337:3;28333:14;28326:47;28422:4;28415:5;28411:16;28405:23;28398:4;28393:3;28389:14;28382:47;28478:4;28471:5;28467:16;28461:23;28454:4;28449:3;28445:14;28438:47;28192:3;28531:4;28524:5;28520:16;28514:23;28569:4;28562;28557:3;28553:14;28546:28;28590:47;28631:4;28626:3;28622:14;28608:12;28590:47;:::i;28648:420::-;28897:6;28886:9;28879:25;28940:2;28935;28924:9;28920:18;28913:30;28860:4;28960:59;29015:2;29004:9;29000:18;28992:6;28960:59;:::i;:::-;28952:67;;29055:6;29050:2;29039:9;29035:18;29028:34;28648:420;;;;;;:::o;29287:217::-;29327:1;29353;29343:132;;29397:10;29392:3;29388:20;29385:1;29378:31;29432:4;29429:1;29422:15;29460:4;29457:1;29450:15;29343:132;-1:-1:-1;29489:9:70;;29287:217::o;31382:631::-;31561:2;31550:9;31543:21;31636:1;31632;31627:3;31623:11;31619:19;31610:6;31604:13;31600:39;31595:2;31584:9;31580:18;31573:67;31704:4;31698:2;31690:6;31686:15;31680:22;31676:33;31671:2;31660:9;31656:18;31649:61;31764:2;31756:6;31752:15;31746:22;31741:2;31730:9;31726:18;31719:50;31824:2;31816:6;31812:15;31806:22;31800:3;31789:9;31785:19;31778:51;31524:4;31876:3;31868:6;31864:16;31858:23;31919:4;31912;31901:9;31897:20;31890:34;31941:66;32002:3;31991:9;31987:19;31973:12;31941:66;:::i;32018:301::-;32147:3;32185:6;32179:13;32231:6;32224:4;32216:6;32212:17;32207:3;32201:37;32293:1;32257:16;;32282:13;;;-1:-1:-1;32257:16:70;32018:301;-1:-1:-1;32018:301:70:o;32733:245::-;32800:6;32853:2;32841:9;32832:7;32828:23;32824:32;32821:52;;;32869:1;32866;32859:12;32821:52;32901:9;32895:16;32920:28;32942:5;32920:28;:::i;33814:135::-;33853:3;33874:17;;;33871:43;;33894:18;;:::i;:::-;-1:-1:-1;33941:1:70;33930:13;;33814:135::o;36293:399::-;36495:2;36477:21;;;36534:2;36514:18;;;36507:30;36573:34;36568:2;36553:18;;36546:62;-1:-1:-1;;;36639:2:70;36624:18;;36617:33;36682:3;36667:19;;36293:399::o;38731:518::-;38833:2;38828:3;38825:11;38822:421;;;38869:5;38866:1;38859:16;38913:4;38910:1;38900:18;38983:2;38971:10;38967:19;38964:1;38960:27;38954:4;38950:38;39019:4;39007:10;39004:20;39001:47;;;-1:-1:-1;39042:4:70;39001:47;39097:2;39092:3;39088:12;39085:1;39081:20;39075:4;39071:31;39061:41;;39152:81;39170:2;39163:5;39160:13;39152:81;;;39229:1;39215:16;;39196:1;39185:13;39152:81;;39425:1299;39551:3;39545:10;-1:-1:-1;;;;;39570:6:70;39567:30;39564:56;;;39600:18;;:::i;:::-;39629:97;39719:6;39679:38;39711:4;39705:11;39679:38;:::i;:::-;39673:4;39629:97;:::i;:::-;39775:4;39806:2;39795:14;;39823:1;39818:649;;;;40511:1;40528:6;40525:89;;;-1:-1:-1;40580:19:70;;;40574:26;40525:89;-1:-1:-1;;39382:1:70;39378:11;;;39374:24;39370:29;39360:40;39406:1;39402:11;;;39357:57;40627:81;;39788:930;;39818:649;38678:1;38671:14;;;38715:4;38702:18;;-1:-1:-1;;39854:20:70;;;39972:222;39986:7;39983:1;39980:14;39972:222;;;40068:19;;;40062:26;40047:42;;40175:4;40160:20;;;;40128:1;40116:14;;;;40002:12;39972:222;;;39976:3;40222:6;40213:7;40210:19;40207:201;;;40283:19;;;40277:26;-1:-1:-1;;40366:1:70;40362:14;;;40378:3;40358:24;40354:37;40350:42;40335:58;40320:74;;40207:201;-1:-1:-1;;;;40454:1:70;40438:14;;;40434:22;40421:36;;-1:-1:-1;39425:1299:70:o",
    linkReferences: {},
    immutableReferences: {
      "35863": [
        { start: 10262, length: 32 },
        { start: 10303, length: 32 },
        { start: 10627, length: 32 },
      ],
    },
  },
  methodIdentifiers: {
    "UPGRADE_INTERFACE_VERSION()": "ad3cb1cc",
    "_hashActionPayload(address,(address,uint256,uint256,uint256,uint256,bytes))": "7aab6910",
    "_hashActionPayloadWithCustomNonce((address,uint256,uint256,uint256,uint256,bytes),uint256)": "b726d882",
    "actionBecomesActiveAt(uint256)": "63b5a5c0",
    "actionInfo(uint256)": "137db525",
    "actionIsActive(uint256)": "79d7ca52",
    "aggregator()": "245a7bfc",
    "balanceAndNonce(address,address)": "03f95bf1",
    "balanceOf(address,address)": "f7888aec",
    "balanceOf(address,uint256)": "00fdd58e",
    "balanceOfBatch(address[],uint256[])": "4e1273f4",
    "batchCSAInfo(address[],address[])": "3cb86b7a",
    "feeCollector()": "c415b95c",
    "getActionHandlingInfo(uint256)": "e3a4865f",
    "getMandatoryFee(uint256,uint256)": "aba4ef1a",
    "initialize()": "8129fc1c",
    "isApprovedForAll(address,address)": "e985e9c5",
    "nonceOf(address,address)": "efd61e60",
    "operator()": "570ca735",
    "operatorExecute((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes))[])": "c91db843",
    "owner()": "8da5cb5b",
    "proxiableUUID()": "52d1902d",
    "renounceOwnership()": "715018a6",
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)": "2eb2c2d6",
    "safeTransferFrom(address,address,uint256,uint256,bytes)": "f242432a",
    "setApprovalForAll(address,bool)": "a22cb465",
    "supportsInterface(bytes4)": "01ffc9a7",
    "transferOwnership(address)": "f2fde38b",
    "unwrap((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))": "2860cfdf",
    "updateConfig((address,address,address,(uint256,(uint16,address))[]))": "65df7ed9",
    "upgradeToAndCall(address,bytes)": "4f1ef286",
    "uri(uint256)": "0e89341c",
    "wrap(address,address,uint256)": "62355638",
    "wrapERC20(address,address,uint256)": "5d85a3a1",
    "wrapNative(address)": "2479d863",
  },
  rawMetadata:
    '{"compiler":{"version":"0.8.30+commit.73712a01"},"language":"Solidity","output":{"abi":[{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"AddressEmptyCode","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ERC1155InsufficientBalance","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC1155InvalidApprover","type":"error"},{"inputs":[{"internalType":"uint256","name":"idsLength","type":"uint256"},{"internalType":"uint256","name":"valuesLength","type":"uint256"}],"name":"ERC1155InvalidArrayLength","type":"error"},{"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"ERC1155InvalidOperator","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC1155InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC1155InvalidSender","type":"error"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"owner","type":"address"}],"name":"ERC1155MissingApprovalForAll","type":"error"},{"inputs":[{"internalType":"address","name":"implementation","type":"address"}],"name":"ERC1967InvalidImplementation","type":"error"},{"inputs":[],"name":"ERC1967NonPayable","type":"error"},{"inputs":[],"name":"FailedCall","type":"error"},{"inputs":[],"name":"InvalidInitialization","type":"error"},{"inputs":[],"name":"NotInitializing","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"inputs":[],"name":"UUPSUnauthorizedCallContext","type":"error"},{"inputs":[{"internalType":"bytes32","name":"slot","type":"bytes32"}],"name":"UUPSUnsupportedProxiableUUID","type":"error"},{"anonymous":false,"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint8","name":"signature_v","type":"uint8"},{"internalType":"bytes32","name":"signature_r","type":"bytes32"},{"internalType":"bytes32","name":"signature_s","type":"bytes32"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"actionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"totalFee","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"bytes","name":"parameters","type":"bytes"}],"internalType":"struct CSUC_Types.ActionPayload","name":"payload","type":"tuple"}],"indexed":false,"internalType":"struct CSUC_Types.Action","name":"action","type":"tuple"}],"name":"ActionExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"components":[{"internalType":"address","name":"newOperator","type":"address"},{"internalType":"address","name":"newFeeCollector","type":"address"},{"internalType":"address","name":"newAggregator","type":"address"},{"components":[{"internalType":"uint256","name":"actionId","type":"uint256"},{"components":[{"internalType":"uint16","name":"mandatoryFeePoints","type":"uint16"},{"internalType":"address","name":"handler","type":"address"}],"internalType":"struct CSUC_Types.ActionHandlingInfo","name":"info","type":"tuple"}],"internalType":"struct CSUC_Types.ActionHandlingInfoUpdate[]","name":"actionHandlingInfoUpdate","type":"tuple[]"}],"indexed":false,"internalType":"struct CSUC_Types.ConfigUpdate","name":"update","type":"tuple"}],"name":"ConfigUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint64","name":"version","type":"uint64"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"values","type":"uint256[]"}],"name":"TransferBatch","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"TransferSingle","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"value","type":"string"},{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"URI","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"UnwrappingToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"WrappingToken","type":"event"},{"inputs":[],"name":"UPGRADE_INTERFACE_VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"actionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"totalFee","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"bytes","name":"parameters","type":"bytes"}],"internalType":"struct CSUC_Types.ActionPayload","name":"_payload","type":"tuple"}],"name":"_hashActionPayload","outputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"actionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"totalFee","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"bytes","name":"parameters","type":"bytes"}],"internalType":"struct CSUC_Types.ActionPayload","name":"_payload","type":"tuple"},{"internalType":"uint256","name":"_nonce","type":"uint256"}],"name":"_hashActionPayloadWithCustomNonce","outputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"actionBecomesActiveAt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"actionInfo","outputs":[{"internalType":"uint16","name":"mandatoryFeePoints","type":"uint16"},{"internalType":"address","name":"handler","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_actionId","type":"uint256"}],"name":"actionIsActive","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aggregator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"balanceAndNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"uint256","name":"_token","type":"uint256"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"balanceOfBatch","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_owners","type":"address[]"},{"internalType":"address[]","name":"_tokens","type":"address[]"}],"name":"batchCSAInfo","outputs":[{"components":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"internalType":"struct CSUC_Types.CSAInfo[]","name":"_csaInfos","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feeCollector","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_actionId","type":"uint256"}],"name":"getActionHandlingInfo","outputs":[{"components":[{"internalType":"uint16","name":"mandatoryFeePoints","type":"uint16"},{"internalType":"address","name":"handler","type":"address"}],"internalType":"struct CSUC_Types.ActionHandlingInfo","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_actionId","type":"uint256"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"getMandatoryFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_owner","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"name":"nonceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"operator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint8","name":"signature_v","type":"uint8"},{"internalType":"bytes32","name":"signature_r","type":"bytes32"},{"internalType":"bytes32","name":"signature_s","type":"bytes32"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"actionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"totalFee","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"bytes","name":"parameters","type":"bytes"}],"internalType":"struct CSUC_Types.ActionPayload","name":"payload","type":"tuple"}],"internalType":"struct CSUC_Types.Action[]","name":"_actions","type":"tuple[]"}],"name":"operatorExecute","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256[]","name":"_ids","type":"uint256[]"},{"internalType":"uint256[]","name":"_values","type":"uint256[]"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeBatchTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_id","type":"uint256"},{"internalType":"uint256","name":"_value","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint8","name":"signature_v","type":"uint8"},{"internalType":"bytes32","name":"signature_r","type":"bytes32"},{"internalType":"bytes32","name":"signature_s","type":"bytes32"},{"components":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"actionId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"totalFee","type":"uint256"},{"internalType":"uint256","name":"limit","type":"uint256"},{"internalType":"bytes","name":"parameters","type":"bytes"}],"internalType":"struct CSUC_Types.ActionPayload","name":"payload","type":"tuple"}],"internalType":"struct CSUC_Types.Action","name":"_action","type":"tuple"}],"name":"unwrap","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"newOperator","type":"address"},{"internalType":"address","name":"newFeeCollector","type":"address"},{"internalType":"address","name":"newAggregator","type":"address"},{"components":[{"internalType":"uint256","name":"actionId","type":"uint256"},{"components":[{"internalType":"uint16","name":"mandatoryFeePoints","type":"uint16"},{"internalType":"address","name":"handler","type":"address"}],"internalType":"struct CSUC_Types.ActionHandlingInfo","name":"info","type":"tuple"}],"internalType":"struct CSUC_Types.ActionHandlingInfoUpdate[]","name":"actionHandlingInfoUpdate","type":"tuple[]"}],"internalType":"struct CSUC_Types.ConfigUpdate","name":"_update","type":"tuple"}],"name":"updateConfig","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"uri","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"wrap","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"wrapERC20","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"}],"name":"wrapNative","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"payable","type":"function"}],"devdoc":{"author":"Curvy Protocol (https://curvy.box)","details":"CSUC main contract.","errors":{"AddressEmptyCode(address)":[{"details":"There\'s no code at `target` (it is not a contract)."}],"ERC1155InsufficientBalance(address,uint256,uint256,uint256)":[{"details":"Indicates an error related to the current `balance` of a `sender`. Used in transfers.","params":{"balance":"Current balance for the interacting account.","needed":"Minimum amount required to perform a transfer.","sender":"Address whose tokens are being transferred.","tokenId":"Identifier number of a token."}}],"ERC1155InvalidApprover(address)":[{"details":"Indicates a failure with the `approver` of a token to be approved. Used in approvals.","params":{"approver":"Address initiating an approval operation."}}],"ERC1155InvalidArrayLength(uint256,uint256)":[{"details":"Indicates an array length mismatch between ids and values in a safeBatchTransferFrom operation. Used in batch transfers.","params":{"idsLength":"Length of the array of token identifiers","valuesLength":"Length of the array of token amounts"}}],"ERC1155InvalidOperator(address)":[{"details":"Indicates a failure with the `operator` to be approved. Used in approvals.","params":{"operator":"Address that may be allowed to operate on tokens without being their owner."}}],"ERC1155InvalidReceiver(address)":[{"details":"Indicates a failure with the token `receiver`. Used in transfers.","params":{"receiver":"Address to which tokens are being transferred."}}],"ERC1155InvalidSender(address)":[{"details":"Indicates a failure with the token `sender`. Used in transfers.","params":{"sender":"Address whose tokens are being transferred."}}],"ERC1155MissingApprovalForAll(address,address)":[{"details":"Indicates a failure with the `operator`\\u2019s approval. Used in transfers.","params":{"operator":"Address that may be allowed to operate on tokens without being their owner.","owner":"Address of the current owner of a token."}}],"ERC1967InvalidImplementation(address)":[{"details":"The `implementation` of the proxy is invalid."}],"ERC1967NonPayable()":[{"details":"An upgrade function sees `msg.value > 0` that may be lost."}],"FailedCall()":[{"details":"A call to an address target failed. The target may have reverted."}],"InvalidInitialization()":[{"details":"The contract is already initialized."}],"NotInitializing()":[{"details":"The contract is not initializing."}],"OwnableInvalidOwner(address)":[{"details":"The owner is not a valid owner account. (eg. `address(0)`)"}],"OwnableUnauthorizedAccount(address)":[{"details":"The caller account is not authorized to perform an operation."}],"ReentrancyGuardReentrantCall()":[{"details":"Unauthorized reentrant call."}],"SafeERC20FailedOperation(address)":[{"details":"An operation with an ERC-20 token failed."}],"UUPSUnauthorizedCallContext()":[{"details":"The call is from an unauthorized context."}],"UUPSUnsupportedProxiableUUID(bytes32)":[{"details":"The storage `slot` is unsupported as a UUID."}]},"events":{"ActionExecuted((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))":{"params":{"action":"The passed action object which was executed."}},"ApprovalForAll(address,address,bool)":{"details":"Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to `approved`."},"ConfigUpdated((address,address,address,(uint256,(uint16,address))[]))":{"params":{"update":"The passed configuration update object."}},"Initialized(uint64)":{"details":"Triggered when the contract has been initialized or reinitialized."},"TransferBatch(address,address,address,uint256[],uint256[])":{"details":"Equivalent to multiple {TransferSingle} events, where `operator`, `from` and `to` are the same for all transfers."},"TransferSingle(address,address,address,uint256,uint256)":{"details":"Emitted when `value` amount of tokens of type `id` are transferred from `from` to `to` by `operator`."},"URI(string,uint256)":{"details":"Emitted when the URI for token type `id` changes to `value`, if it is a non-programmatic URI. If an {URI} event was emitted for `id`, the standard https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[guarantees] that `value` will equal the value returned by {IERC1155MetadataURI-uri}."},"UnwrappingToken(address,address,uint256)":{"params":{"amount":"The amount of tokens that was withdrawn.","to":"The User\'s CSA address.","token":"The token address."}},"Upgraded(address)":{"details":"Emitted when the implementation is upgraded."},"WrappingToken(address,address,uint256)":{"params":{"amount":"The amount of tokens that was deposited.","to":"The User\'s CSA address.","token":"The token address."}}},"kind":"dev","methods":{"_hashActionPayload(address,(address,uint256,uint256,uint256,uint256,bytes))":{"details":"This function is used to create a unique hash for the action payload, that      can be signed by the User\'s CSA. Its visibility is public to allow for easier      testing and debugging.","params":{"_from":"The address of the User\'s CSA.","_payload":"The action payload containing the action details."},"returns":{"_hash":"Returns the hash of the action payload."}},"_hashActionPayloadWithCustomNonce((address,uint256,uint256,uint256,uint256,bytes),uint256)":{"details":"This function is used to create a unique hash for the action payload, that      can be signed by the User\'s CSA. Its visibility is public to allow for easier      testing and debugging.","params":{"_nonce":"The custom nonce to be used in the hash.","_payload":"The action payload containing the action details."},"returns":{"_hash":"Returns the hash of the action payload."}},"actionIsActive(uint256)":{"details":"After adding a new custom action, there is a time delay before it becomes active, and can be invoked.","returns":{"_0":"Returns whether the call was successful."}},"balanceOf(address,address)":{"params":{"_owner":"The User\'s CSA.","_token":"The token address."},"returns":{"_0":"Returns the User\'s CSA token balance."}},"balanceOf(address,uint256)":{"details":"See {IERC1155-balanceOf}."},"balanceOfBatch(address[],uint256[])":{"details":"See {IERC1155-balanceOfBatch}. Requirements: - `accounts` and `ids` must have the same length."},"batchCSAInfo(address[],address[])":{"params":{"_owners":"The User\'s CSA owner addresses.","_tokens":"The token address used for the User\'s CSAs."},"returns":{"_csaInfos":"Returns the User\'s CSA information."}},"getActionHandlingInfo(uint256)":{"details":"This function provides details about how a specific action is handled, including the handler address and any additional parameters.","params":{"_actionId":"The ID of the action for which the handling info is requested."},"returns":{"_0":"Returns the action handling info."}},"getMandatoryFee(uint256,uint256)":{"details":"The fee is calculated based on the action ID and the amount of tokens involved.","params":{"_actionId":"The ID of the action for which the fee is being calculated.","_amount":"The amount of tokens involved in the action."},"returns":{"_0":"Returns the mandatory fee for the action."}},"isApprovedForAll(address,address)":{"details":"See {IERC1155-isApprovedForAll}."},"nonceOf(address,address)":{"params":{"_owner":"The User\'s CSA.","_token":"The token address."},"returns":{"_0":"Returns the User\'s CSA token balance."}},"operatorExecute((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes))[])":{"details":"This function allows the `operator` to execute multiple actions in a single transaction.      The actions must be valid. Invalid actions will passed over.","params":{"_actions":"An array of User actions to be executed."},"returns":{"_0":"Returns the number of successfully executed actions."}},"owner()":{"details":"Returns the address of the current owner."},"proxiableUUID()":{"details":"Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation\'s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier."},"renounceOwnership()":{"details":"Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner."},"safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)":{"details":"See {IERC1155-safeBatchTransferFrom}."},"safeTransferFrom(address,address,uint256,uint256,bytes)":{"details":"See {IERC1155-safeTransferFrom}."},"setApprovalForAll(address,bool)":{"details":"See {IERC1155-setApprovalForAll}."},"supportsInterface(bytes4)":{"details":"See {IERC165-supportsInterface}."},"transferOwnership(address)":{"details":"Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner."},"unwrap((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))":{"params":{"_action":"The action containing all of the necessary info."},"returns":{"_0":"Returns whether the call was successful."}},"updateConfig((address,address,address,(uint256,(uint16,address))[]))":{"details":"This function allows the protocol\'s `owner` to update the existing action handling fields,      as well as the `fee collector` / `operator` address, and to add new actions to the CSUC.","returns":{"_0":"Returns whether the call was successful."}},"upgradeToAndCall(address,bytes)":{"custom:oz-upgrades-unsafe-allow-reachable":"delegatecall","details":"Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event."},"uri(uint256)":{"details":"See {IERC1155MetadataURI-uri}. This implementation returns the same URI for *all* token types. It relies on the token type ID substitution mechanism https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the ERC]. Clients calling this function must replace the `\\\\{id\\\\}` substring with the actual token type ID."},"wrap(address,address,uint256)":{"details":"This function allows passing a native token as `msg.value` that will be also added to the User\'s CSA balance.","params":{"_to":"The User\'s CSA.","_token":"The token address."},"returns":{"_0":"Returns whether the call was successful."}},"wrapERC20(address,address,uint256)":{"details":"This function requires that the `msg.sender` has already approved the CSUC contract to spend the token.","params":{"_to":"The User\'s CSA.","_token":"The token address."},"returns":{"_0":"Returns whether the call was successful."}},"wrapNative(address)":{"details":"Amount is passed as `msg.value`, and the User\'s CSA balance is updated accordingly.","params":{"_to":"The User\'s CSA."},"returns":{"_0":"Returns whether the call was successful."}}},"title":"CSUC (Curvy Single User Contract)","version":1},"userdoc":{"events":{"ActionExecuted((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))":{"notice":"Emitted when any User\'s CSA action is executed."},"ConfigUpdated((address,address,address,(uint256,(uint16,address))[]))":{"notice":"Emitted when a on-chain configuration is updated."},"UnwrappingToken(address,address,uint256)":{"notice":"Emitted when a User\'s CSA token balance is updated."},"WrappingToken(address,address,uint256)":{"notice":"Emitted when there\'s a \'deposit\' of a token to a User\'s CSA."}},"kind":"user","methods":{"_hashActionPayload(address,(address,uint256,uint256,uint256,uint256,bytes))":{"notice":"Hashes the action payload with the User\'s address and the current nonce."},"_hashActionPayloadWithCustomNonce((address,uint256,uint256,uint256,uint256,bytes),uint256)":{"notice":"Hashes the action payload with the User\'s address and a custom nonce."},"actionBecomesActiveAt(uint256)":{"notice":"notice The mapping of action IDs to the block number when they become active."},"actionInfo(uint256)":{"notice":"notice The mapping of action IDs to their handling info."},"actionIsActive(uint256)":{"notice":"Returns the indication whether a specific action is active."},"aggregator()":{"notice":"notice The address of the Aggregator contract that interacts with CSUC."},"balanceAndNonce(address,address)":{"notice":"notice The mapping of User\'s CSA balances and nonces. dev The mapping is structured as mapping[token][owner] = packedBalanceAndNonce."},"balanceOf(address,address)":{"notice":"Returns the User\'s CSA token balance;"},"batchCSAInfo(address[],address[])":{"notice":"Returns the User\'s CSA information for a given owner and token."},"feeCollector()":{"notice":"notice The fee collector address that receives all action fees."},"getActionHandlingInfo(uint256)":{"notice":"Returns the action handling info for a given action ID."},"getMandatoryFee(uint256,uint256)":{"notice":"Returns the mandatory fee for a given action."},"nonceOf(address,address)":{"notice":"Returns the User\'s CSA token balance;"},"operator()":{"notice":"notice The operator address that can execute actions on behalf of Users."},"operatorExecute((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes))[])":{"notice":"Executes a bundle of User actions."},"unwrap((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))":{"notice":"Unwraps (Withdraws) a passed token from CSA\'s balance to the desired destination."},"updateConfig((address,address,address,(uint256,(uint16,address))[]))":{"notice":"Updates the protocol\'s on-chain configuration."},"wrap(address,address,uint256)":{"notice":"Wraps a passed token, and adds it to the User\'s CSA balance."},"wrapERC20(address,address,uint256)":{"notice":"Wraps a passed token, and adds it to the User\'s CSA balance."},"wrapNative(address)":{"notice":"Wraps a native token (i.e. Ether), and adds it to the User\'s CSA balance."}},"version":1}},"settings":{"compilationTarget":{"src/csuc/CSUC.sol":"CSUC"},"evmVersion":"cancun","libraries":{},"metadata":{"appendCBOR":false,"bytecodeHash":"none"},"optimizer":{"enabled":true,"runs":200},"remappings":[":\\"@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/",":@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/",":@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",":erc4626-tests/=lib/openzeppelin-contracts-upgradeable/lib/erc4626-tests/",":forge-std/=lib/forge-std/src/",":halmos-cheatcodes/=lib/openzeppelin-contracts-upgradeable/lib/halmos-cheatcodes/src/",":openzeppelin-contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/",":openzeppelin-contracts/=lib/openzeppelin-contracts/",":poseidon-solidity/=lib/poseidon-solidity/contracts/"]},"sources":{"lib/openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol":{"keccak256":"0xc163fcf9bb10138631a9ba5564df1fa25db9adff73bd9ee868a8ae1858fe093a","license":"MIT","urls":["bzz-raw://9706d43a0124053d9880f6e31a59f31bc0a6a3dc1acd66ce0a16e1111658c5f6","dweb:/ipfs/QmUFmfowzkRwGtDu36cXV9SPTBHJ3n7dG9xQiK5B28jTf2"]},"lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol":{"keccak256":"0xdb4d24ee2c087c391d587cd17adfe5b3f9d93b3110b1388c2ab6c7c0ad1dcd05","license":"MIT","urls":["bzz-raw://ab7b6d5b9e2b88176312967fe0f0e78f3d9a1422fa5e4b64e2440c35869b5d08","dweb:/ipfs/QmXKYWWyzcLg1B2k7Sb1qkEXgLCYfXecR9wYW5obRzWP1Q"]},"lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol":{"keccak256":"0x574a7451e42724f7de29e2855c392a8a5020acd695169466a18459467d719d63","license":"MIT","urls":["bzz-raw://5bc189f63b639ee173dd7b6fecc39baf7113bf161776aea22b34c57fdd1872ec","dweb:/ipfs/QmZAf2VtjDLRULqjJkde6LNsxAg12tUqpPqgUQQZbAjgtZ"]},"lib/openzeppelin-contracts-upgradeable/contracts/token/ERC1155/ERC1155Upgradeable.sol":{"keccak256":"0x3a0d63838dff3fd8b77c8c44ecf37cc39b15f26fd5269da3b690879478fa3cf3","license":"MIT","urls":["bzz-raw://502cec8d2ef132cce69840b1c2aef2209092554292a50d628b27477ef7a441ca","dweb:/ipfs/QmaSxcHDndhVuWm4E6LcSMRkhFYsMXxrgLWMLCQnyG3qHr"]},"lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol":{"keccak256":"0xdbef5f0c787055227243a7318ef74c8a5a1108ca3a07f2b3a00ef67769e1e397","license":"MIT","urls":["bzz-raw://08e39f23d5b4692f9a40803e53a8156b72b4c1f9902a88cd65ba964db103dab9","dweb:/ipfs/QmPKn6EYDgpga7KtpkA8wV2yJCYGMtc9K4LkJfhKX2RVSV"]},"lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol":{"keccak256":"0xc8ed8d2056934b7675b695dec032f2920c2f5c6cf33a17ca85650940675323ab","license":"MIT","urls":["bzz-raw://3c8ccc75d1cd792d192aa09e54dd49ea35fe85baa9fcd17486f29227d9f29b89","dweb:/ipfs/QmbboSbFUEiM9tdEgBwuTRb7bykFoJXZ7dsSr1PSREJXMr"]},"lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol":{"keccak256":"0x9b6b3e7803bc5f2f8cd7ad57db8ac1def61a9930a5a3107df4882e028a9605d7","license":"MIT","urls":["bzz-raw://da62d6be1f5c6edf577f0cb45666a8aa9c2086a4bac87d95d65f02e2f4c36a4b","dweb:/ipfs/QmNkpvBpoCMvX8JwAFNSc5XxJ2q5BXJpL5L1txb4QkqVFF"]},"lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol":{"keccak256":"0xde7e9fd9aee8d4f40772f96bb3b58836cbc6dfc0227014a061947f8821ea9724","license":"MIT","urls":["bzz-raw://11fea9f8bc98949ac6709f0c1699db7430d2948137aa94d5a9e95a91f61a710a","dweb:/ipfs/QmQdfRXxQjwP6yn3DVo1GHPpriKNcFghSPi94Z1oKEFUNS"]},"lib/openzeppelin-contracts/contracts/interfaces/IERC1967.sol":{"keccak256":"0xb25a4f11fa80c702bf5cd85adec90e6f6f507f32f4a8e6f5dbc31e8c10029486","license":"MIT","urls":["bzz-raw://6917f8a323e7811f041aecd4d9fd6e92455a6fba38a797ac6f6e208c7912b79d","dweb:/ipfs/QmShuYv55wYHGi4EFkDB8QfF7ZCHoKk2efyz3AWY1ExSq7"]},"lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol":{"keccak256":"0xce41876e78d1badc0512229b4d14e4daf83bc1003d7f83978d18e0e56f965b9c","license":"MIT","urls":["bzz-raw://a2608291cb038b388d80b79a06b6118a42f7894ff67b7da10ec0dbbf5b2973ba","dweb:/ipfs/QmWohqcBLbcxmA4eGPhZDXe5RYMMEEpFq22nfkaUMvTfw1"]},"lib/openzeppelin-contracts/contracts/interfaces/draft-IERC1822.sol":{"keccak256":"0xc42facb5094f2f35f066a7155bda23545e39a3156faef3ddc00185544443ba7d","license":"MIT","urls":["bzz-raw://d3b36282ab029b46bd082619a308a2ea11c309967b9425b7b7a6eb0b0c1c3196","dweb:/ipfs/QmP2YVfDB2FoREax3vJu7QhDnyYRMw52WPrCD4vdT2kuDA"]},"lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol":{"keccak256":"0x880da465c203cec76b10d72dbd87c80f387df4102274f23eea1f9c9b0918792b","license":"MIT","urls":["bzz-raw://399594cd8bb0143bc9e55e0f1d071d0d8c850a394fb7a319d50edd55d9ed822b","dweb:/ipfs/QmbPZzgtT6LEm9CMqWfagQFwETbV1ztpECBB1DtQHrKiRz"]},"lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Utils.sol":{"keccak256":"0x8decfa54cec979c824b044b8128cd91d713f72c71fd7dfa54974624d8c949898","license":"MIT","urls":["bzz-raw://271f914261a19d87117a777e0924ada545c16191ef9b00cc40b0134fc14ebc70","dweb:/ipfs/QmdvVNWHGHQrGGPonZJs5NuzTevTjZRM2zayKrDJf7WBA2"]},"lib/openzeppelin-contracts/contracts/proxy/beacon/IBeacon.sol":{"keccak256":"0xc59a78b07b44b2cf2e8ab4175fca91e8eca1eee2df7357b8d2a8833e5ea1f64c","license":"MIT","urls":["bzz-raw://5aa4f07e65444784c29cd7bfcc2341b34381e4e5b5da9f0c5bd00d7f430e66fa","dweb:/ipfs/QmWRMh4Q9DpaU9GvsiXmDdoNYMyyece9if7hnfLz7uqzWM"]},"lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol":{"keccak256":"0x22933f0f4897ff70a991c3baebfbc2574fd052dc4bae7fcafec45b07c1f23dd3","license":"MIT","urls":["bzz-raw://13674cffad18cec55f013056496d7d2e3a34bd7bdbe23d1ef0c7588088c73367","dweb:/ipfs/QmcBkrwxNvCApG48Gyby2L6qCNtuhaFncGpbJt3zuukTmu"]},"lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol":{"keccak256":"0x1d7a05b3219532ea5ece50a80cf390cac9109dc74e07763adfa463ab5a3af0dc","license":"MIT","urls":["bzz-raw://687e2ec572d0e63827bb0025b91f2246be4c938f830ef4b4c288ee2e3727d5ca","dweb:/ipfs/QmZXWSAQ9ftVrqNEa5ZTpN4wxvzCgsSW12cgiSRkrLTpQ8"]},"lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155Receiver.sol":{"keccak256":"0x61a23d601c2ab69dd726ac55058604cbda98e1d728ba31a51c379a3f9eeea715","license":"MIT","urls":["bzz-raw://d8cbb06152d82ebdd5ba1d33454e5759492040f309a82637c7e99c948a04fa20","dweb:/ipfs/QmQQuLr6WSfLu97pMEh6XLefk99TSj9k5Qu1zXGPepwGiK"]},"lib/openzeppelin-contracts/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol":{"keccak256":"0x35d120c427299af1525aaf07955314d9e36a62f14408eb93dec71a2e001f74d3","license":"MIT","urls":["bzz-raw://743e38acf441eece428c008be399c40a3ca5b2d595d58faf656cbdbac1a45374","dweb:/ipfs/QmcWDuWkndox3dxa5P7ZgpKy3iuQKkxBq1cR9hPV1ZzAfa"]},"lib/openzeppelin-contracts/contracts/token/ERC1155/utils/ERC1155Utils.sol":{"keccak256":"0x22f099c02c252dd1f6ddc464916ce683294a63b23b3c6ee3d290b77398e2474b","license":"MIT","urls":["bzz-raw://82d2ba4b77ecc4f70211e0de1a920e3ea29eb86c3e16ef8f2a7d746c72a97f1e","dweb:/ipfs/QmYBqATARQEnxd33jW6iYCuEPaL6KdYyYSoQrjFXZka3of"]},"lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol":{"keccak256":"0xe06a3f08a987af6ad2e1c1e774405d4fe08f1694b67517438b467cecf0da0ef7","license":"MIT","urls":["bzz-raw://df6f0c459663c9858b6cba2cda1d14a7d05a985bed6d2de72bd8e78c25ee79db","dweb:/ipfs/QmeTTxZ7qVk9rjEv2R4CpCwdf8UMCcRqDNMvzNxHc3Fnn9"]},"lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol":{"keccak256":"0x982c5cb790ab941d1e04f807120a71709d4c313ba0bfc16006447ffbd27fbbd5","license":"MIT","urls":["bzz-raw://8150ceb4ac947e8a442b2a9c017e01e880b2be2dd958f1fa9bc405f4c5a86508","dweb:/ipfs/QmbcBmFX66AY6Kbhnd5gx7zpkgqnUafo43XnmayAM7zVdB"]},"lib/openzeppelin-contracts/contracts/utils/Address.sol":{"keccak256":"0xaaa1d17c1129b127a4a401db2fbd72960e2671474be3d08cae71ccdc42f7624c","license":"MIT","urls":["bzz-raw://cb2f27cd3952aa667e198fba0d9b7bcec52fbb12c16f013c25fe6fb52b29cc0e","dweb:/ipfs/QmeuohBFoeyDPZA9JNCTEDz3VBfBD4EABWuWXVhHAuEpKR"]},"lib/openzeppelin-contracts/contracts/utils/Arrays.sol":{"keccak256":"0x55a4fdb408e3db950b48f4a6131e538980be8c5f48ee59829d92d66477140cd6","license":"MIT","urls":["bzz-raw://3e1ad251e692822ce1494135a4ecb5b97c19b90aa82418fd2959ce32017953fd","dweb:/ipfs/QmT6N7mf6heZYhY2BAQ5kwZp9o3SXzGVdkMqUszx67WRDN"]},"lib/openzeppelin-contracts/contracts/utils/Comparators.sol":{"keccak256":"0x302eecd8cf323b4690e3494a7d960b3cbce077032ab8ef655b323cdd136cec58","license":"MIT","urls":["bzz-raw://49ba706f1bc476d68fe6c1fad75517acea4e9e275be0989b548e292eb3a3eacd","dweb:/ipfs/QmeBpvcdGWzWMKTQESUCEhHgnEQYYATVwPxLMxa6vMT7jC"]},"lib/openzeppelin-contracts/contracts/utils/Context.sol":{"keccak256":"0x493033a8d1b176a037b2cc6a04dad01a5c157722049bbecf632ca876224dd4b2","license":"MIT","urls":["bzz-raw://6a708e8a5bdb1011c2c381c9a5cfd8a9a956d7d0a9dc1bd8bcdaf52f76ef2f12","dweb:/ipfs/Qmax9WHBnVsZP46ZxEMNRQpLQnrdE4dK8LehML1Py8FowF"]},"lib/openzeppelin-contracts/contracts/utils/Errors.sol":{"keccak256":"0x6afa713bfd42cf0f7656efa91201007ac465e42049d7de1d50753a373648c123","license":"MIT","urls":["bzz-raw://ba1d02f4847670a1b83dec9f7d37f0b0418d6043447b69f3a29a5f9efc547fcf","dweb:/ipfs/QmQ7iH2keLNUKgq2xSWcRmuBE5eZ3F5whYAkAGzCNNoEWB"]},"lib/openzeppelin-contracts/contracts/utils/Panic.sol":{"keccak256":"0xf7fe324703a64fc51702311dc51562d5cb1497734f074e4f483bfb6717572d7a","license":"MIT","urls":["bzz-raw://c6a5ff4f9fd8649b7ee20800b7fa387d3465bd77cf20c2d1068cd5c98e1ed57a","dweb:/ipfs/QmVSaVJf9FXFhdYEYeCEfjMVHrxDh5qL4CGkxdMWpQCrqG"]},"lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol":{"keccak256":"0x11a5a79827df29e915a12740caf62fe21ebe27c08c9ae3e09abe9ee3ba3866d3","license":"MIT","urls":["bzz-raw://3cf0c69ab827e3251db9ee6a50647d62c90ba580a4d7bbff21f2bea39e7b2f4a","dweb:/ipfs/QmZiKwtKU1SBX4RGfQtY7PZfiapbbu6SZ9vizGQD9UHjRA"]},"lib/openzeppelin-contracts/contracts/utils/SlotDerivation.sol":{"keccak256":"0x67672e4ca1dafdcc661d4eba8475cfac631fa0933309258e3af7644b92e1fb26","license":"MIT","urls":["bzz-raw://30192451f05ea5ddb0c18bd0f9003f098505836ba19c08a9c365adf829454da2","dweb:/ipfs/QmfCuZSCTyCdFoSKn7MSaN6hZksnQn9ZhrZDAdRTCbwGu2"]},"lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol":{"keccak256":"0xcf74f855663ce2ae00ed8352666b7935f6cddea2932fdf2c3ecd30a9b1cd0e97","license":"MIT","urls":["bzz-raw://9f660b1f351b757dfe01438e59888f31f33ded3afcf5cb5b0d9bf9aa6f320a8b","dweb:/ipfs/QmarDJ5hZEgBtCmmrVzEZWjub9769eD686jmzb2XpSU1cM"]},"lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol":{"keccak256":"0x69f54c02b7d81d505910ec198c11ed4c6a728418a868b906b4a0cf29946fda84","license":"MIT","urls":["bzz-raw://8e25e4bdb7ae1f21d23bfee996e22736fc0ab44cfabedac82a757b1edc5623b9","dweb:/ipfs/QmQdWQvB6JCP9ZMbzi8EvQ1PTETqkcTWrbcVurS7DKpa5n"]},"lib/openzeppelin-contracts/contracts/utils/introspection/ERC165.sol":{"keccak256":"0xddce8e17e3d3f9ed818b4f4c4478a8262aab8b11ed322f1bf5ed705bb4bd97fa","license":"MIT","urls":["bzz-raw://8084aa71a4cc7d2980972412a88fe4f114869faea3fefa5436431644eb5c0287","dweb:/ipfs/Qmbqfs5dRdPvHVKY8kTaeyc65NdqXRQwRK7h9s5UJEhD1p"]},"lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol":{"keccak256":"0x79796192ec90263f21b464d5bc90b777a525971d3de8232be80d9c4f9fb353b8","license":"MIT","urls":["bzz-raw://f6fda447a62815e8064f47eff0dd1cf58d9207ad69b5d32280f8d7ed1d1e4621","dweb:/ipfs/QmfDRc7pxfaXB2Dh9np5Uf29Na3pQ7tafRS684wd3GLjVL"]},"lib/openzeppelin-contracts/contracts/utils/math/Math.sol":{"keccak256":"0x1225214420c83ebcca88f2ae2b50f053aaa7df7bd684c3e878d334627f2edfc6","license":"MIT","urls":["bzz-raw://6c5fab4970634f9ab9a620983dc1c8a30153981a0b1a521666e269d0a11399d3","dweb:/ipfs/QmVRnBC575MESGkEHndjujtR7qub2FzU9RWy9eKLp4hPZB"]},"lib/openzeppelin-contracts/contracts/utils/math/SafeCast.sol":{"keccak256":"0x195533c86d0ef72bcc06456a4f66a9b941f38eb403739b00f21fd7c1abd1ae54","license":"MIT","urls":["bzz-raw://b1d578337048cad08c1c03041cca5978eff5428aa130c781b271ad9e5566e1f8","dweb:/ipfs/QmPFKL2r9CBsMwmUqqdcFPfHZB2qcs9g1HDrPxzWSxomvy"]},"src/csuc/CSUC.sol":{"keccak256":"0xe3aecf112aa0c5e0d5673b728409f2d6ee7b168cb20117febbbb123cc48b0e42","license":"BUSL-1.1","urls":["bzz-raw://95f628ec99a32dca55b037433ad77615dbf39332e58a3f2a7d7387e5c3ea6c1b","dweb:/ipfs/QmYANcfiUTC5HQGGTeTwrvGC7hfrXgkpA2wngF8oGrVRz5"]},"src/csuc/interfaces/ICSUC.sol":{"keccak256":"0x928463af014fd0db59b4a3d1896de40d7580f954ffbaaff80e16278200ab46b8","license":"BUSL-1.1","urls":["bzz-raw://7756ee26537ae6cf49c8edbbd889f2c5ec17ac645be67613fa7b2d133f8e437d","dweb:/ipfs/QmdSCEV2aQgYnJeEQwNEmFmNBzYaDHWpHK38fhrERPRJMo"]},"src/csuc/interfaces/ICSUC_ActionHandler.sol":{"keccak256":"0x23a28b0c983b7c97d0894442250b71a47e99aeb90cfaf6bbdf11499cae69df26","license":"BUSL-1.1","urls":["bzz-raw://dcfebcd0cfea5e814e1da338232e23ac94ad4e667620d087705367994b7e5554","dweb:/ipfs/QmT9nH7YVAhPzK6tjNbhiZvTpeVXBEu8gc7sDh3YWtzQyG"]},"src/csuc/utils/_Constants.sol":{"keccak256":"0x7ae111eb16ac0bdef57f84ed586c46a4f061aaa64abe2f136d990f47065b020e","license":"BUSL-1.1","urls":["bzz-raw://9a647e257e4f00d793f3bc5be66d91fbf92db9a0b4715073ce3e050aa07fc0a8","dweb:/ipfs/QmarJwgCGm3vtyVjkNvyLc18ESisaEXPnexTWnE29Qikjj"]},"src/csuc/utils/_Types.sol":{"keccak256":"0xda01b2068e2f7ef0938ab27a0cf861f2c08df319dace834adf3960cba8fb5f8c","license":"BUSL-1.1","urls":["bzz-raw://db81ec4a16b12ed2f545042107add2b289b05eb7bf33002ee39847e7d127b48d","dweb:/ipfs/QmYVG9M9qVzTNF3xKBaTkW94MzpiH42WQ9nmuBfwXe3jUW"]}},"version":1}',
  metadata: {
    compiler: { version: "0.8.30+commit.73712a01" },
    language: "Solidity",
    output: {
      abi: [
        {
          inputs: [{ internalType: "address", name: "target", type: "address" }],
          type: "error",
          name: "AddressEmptyCode",
        },
        {
          inputs: [
            { internalType: "address", name: "sender", type: "address" },
            { internalType: "uint256", name: "balance", type: "uint256" },
            { internalType: "uint256", name: "needed", type: "uint256" },
            { internalType: "uint256", name: "tokenId", type: "uint256" },
          ],
          type: "error",
          name: "ERC1155InsufficientBalance",
        },
        {
          inputs: [{ internalType: "address", name: "approver", type: "address" }],
          type: "error",
          name: "ERC1155InvalidApprover",
        },
        {
          inputs: [
            { internalType: "uint256", name: "idsLength", type: "uint256" },
            { internalType: "uint256", name: "valuesLength", type: "uint256" },
          ],
          type: "error",
          name: "ERC1155InvalidArrayLength",
        },
        {
          inputs: [{ internalType: "address", name: "operator", type: "address" }],
          type: "error",
          name: "ERC1155InvalidOperator",
        },
        {
          inputs: [{ internalType: "address", name: "receiver", type: "address" }],
          type: "error",
          name: "ERC1155InvalidReceiver",
        },
        {
          inputs: [{ internalType: "address", name: "sender", type: "address" }],
          type: "error",
          name: "ERC1155InvalidSender",
        },
        {
          inputs: [
            { internalType: "address", name: "operator", type: "address" },
            { internalType: "address", name: "owner", type: "address" },
          ],
          type: "error",
          name: "ERC1155MissingApprovalForAll",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "implementation",
              type: "address",
            },
          ],
          type: "error",
          name: "ERC1967InvalidImplementation",
        },
        { inputs: [], type: "error", name: "ERC1967NonPayable" },
        { inputs: [], type: "error", name: "FailedCall" },
        { inputs: [], type: "error", name: "InvalidInitialization" },
        { inputs: [], type: "error", name: "NotInitializing" },
        {
          inputs: [{ internalType: "address", name: "owner", type: "address" }],
          type: "error",
          name: "OwnableInvalidOwner",
        },
        {
          inputs: [{ internalType: "address", name: "account", type: "address" }],
          type: "error",
          name: "OwnableUnauthorizedAccount",
        },
        { inputs: [], type: "error", name: "ReentrancyGuardReentrantCall" },
        {
          inputs: [{ internalType: "address", name: "token", type: "address" }],
          type: "error",
          name: "SafeERC20FailedOperation",
        },
        { inputs: [], type: "error", name: "UUPSUnauthorizedCallContext" },
        {
          inputs: [{ internalType: "bytes32", name: "slot", type: "bytes32" }],
          type: "error",
          name: "UUPSUnsupportedProxiableUUID",
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.Action",
              name: "action",
              type: "tuple",
              components: [
                { internalType: "address", name: "from", type: "address" },
                { internalType: "uint8", name: "signature_v", type: "uint8" },
                {
                  internalType: "bytes32",
                  name: "signature_r",
                  type: "bytes32",
                },
                {
                  internalType: "bytes32",
                  name: "signature_s",
                  type: "bytes32",
                },
                {
                  internalType: "struct CSUC_Types.ActionPayload",
                  name: "payload",
                  type: "tuple",
                  components: [
                    { internalType: "address", name: "token", type: "address" },
                    {
                      internalType: "uint256",
                      name: "actionId",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amount",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "totalFee",
                      type: "uint256",
                    },
                    { internalType: "uint256", name: "limit", type: "uint256" },
                    {
                      internalType: "bytes",
                      name: "parameters",
                      type: "bytes",
                    },
                  ],
                },
              ],
              indexed: false,
            },
          ],
          type: "event",
          name: "ActionExecuted",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "operator",
              type: "address",
              indexed: true,
            },
            {
              internalType: "bool",
              name: "approved",
              type: "bool",
              indexed: false,
            },
          ],
          type: "event",
          name: "ApprovalForAll",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.ConfigUpdate",
              name: "update",
              type: "tuple",
              components: [
                {
                  internalType: "address",
                  name: "newOperator",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "newFeeCollector",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "newAggregator",
                  type: "address",
                },
                {
                  internalType: "struct CSUC_Types.ActionHandlingInfoUpdate[]",
                  name: "actionHandlingInfoUpdate",
                  type: "tuple[]",
                  components: [
                    {
                      internalType: "uint256",
                      name: "actionId",
                      type: "uint256",
                    },
                    {
                      internalType: "struct CSUC_Types.ActionHandlingInfo",
                      name: "info",
                      type: "tuple",
                      components: [
                        {
                          internalType: "uint16",
                          name: "mandatoryFeePoints",
                          type: "uint16",
                        },
                        {
                          internalType: "address",
                          name: "handler",
                          type: "address",
                        },
                      ],
                    },
                  ],
                },
              ],
              indexed: false,
            },
          ],
          type: "event",
          name: "ConfigUpdated",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "uint64",
              name: "version",
              type: "uint64",
              indexed: false,
            },
          ],
          type: "event",
          name: "Initialized",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "previousOwner",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "newOwner",
              type: "address",
              indexed: true,
            },
          ],
          type: "event",
          name: "OwnershipTransferred",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "operator",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "from",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
              indexed: true,
            },
            {
              internalType: "uint256[]",
              name: "ids",
              type: "uint256[]",
              indexed: false,
            },
            {
              internalType: "uint256[]",
              name: "values",
              type: "uint256[]",
              indexed: false,
            },
          ],
          type: "event",
          name: "TransferBatch",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "operator",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "from",
              type: "address",
              indexed: true,
            },
            {
              internalType: "address",
              name: "to",
              type: "address",
              indexed: true,
            },
            {
              internalType: "uint256",
              name: "id",
              type: "uint256",
              indexed: false,
            },
            {
              internalType: "uint256",
              name: "value",
              type: "uint256",
              indexed: false,
            },
          ],
          type: "event",
          name: "TransferSingle",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "string",
              name: "value",
              type: "string",
              indexed: false,
            },
            {
              internalType: "uint256",
              name: "id",
              type: "uint256",
              indexed: true,
            },
          ],
          type: "event",
          name: "URI",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
              indexed: false,
            },
            {
              internalType: "address",
              name: "token",
              type: "address",
              indexed: false,
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
              indexed: false,
            },
          ],
          type: "event",
          name: "UnwrappingToken",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "implementation",
              type: "address",
              indexed: true,
            },
          ],
          type: "event",
          name: "Upgraded",
          anonymous: false,
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "to",
              type: "address",
              indexed: false,
            },
            {
              internalType: "address",
              name: "token",
              type: "address",
              indexed: false,
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
              indexed: false,
            },
          ],
          type: "event",
          name: "WrappingToken",
          anonymous: false,
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "UPGRADE_INTERFACE_VERSION",
          outputs: [{ internalType: "string", name: "", type: "string" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_from", type: "address" },
            {
              internalType: "struct CSUC_Types.ActionPayload",
              name: "_payload",
              type: "tuple",
              components: [
                { internalType: "address", name: "token", type: "address" },
                { internalType: "uint256", name: "actionId", type: "uint256" },
                { internalType: "uint256", name: "amount", type: "uint256" },
                { internalType: "uint256", name: "totalFee", type: "uint256" },
                { internalType: "uint256", name: "limit", type: "uint256" },
                { internalType: "bytes", name: "parameters", type: "bytes" },
              ],
            },
          ],
          stateMutability: "view",
          type: "function",
          name: "_hashActionPayload",
          outputs: [{ internalType: "bytes32", name: "_hash", type: "bytes32" }],
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.ActionPayload",
              name: "_payload",
              type: "tuple",
              components: [
                { internalType: "address", name: "token", type: "address" },
                { internalType: "uint256", name: "actionId", type: "uint256" },
                { internalType: "uint256", name: "amount", type: "uint256" },
                { internalType: "uint256", name: "totalFee", type: "uint256" },
                { internalType: "uint256", name: "limit", type: "uint256" },
                { internalType: "bytes", name: "parameters", type: "bytes" },
              ],
            },
            { internalType: "uint256", name: "_nonce", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
          name: "_hashActionPayloadWithCustomNonce",
          outputs: [{ internalType: "bytes32", name: "_hash", type: "bytes32" }],
        },
        {
          inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
          name: "actionBecomesActiveAt",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
          name: "actionInfo",
          outputs: [
            {
              internalType: "uint16",
              name: "mandatoryFeePoints",
              type: "uint16",
            },
            { internalType: "address", name: "handler", type: "address" },
          ],
        },
        {
          inputs: [{ internalType: "uint256", name: "_actionId", type: "uint256" }],
          stateMutability: "view",
          type: "function",
          name: "actionIsActive",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "aggregator",
          outputs: [{ internalType: "address", name: "", type: "address" }],
        },
        {
          inputs: [
            { internalType: "address", name: "", type: "address" },
            { internalType: "address", name: "", type: "address" },
          ],
          stateMutability: "view",
          type: "function",
          name: "balanceAndNonce",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_owner", type: "address" },
            { internalType: "uint256", name: "_token", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_owner", type: "address" },
            { internalType: "address", name: "_token", type: "address" },
          ],
          stateMutability: "view",
          type: "function",
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [
            { internalType: "address[]", name: "accounts", type: "address[]" },
            { internalType: "uint256[]", name: "ids", type: "uint256[]" },
          ],
          stateMutability: "view",
          type: "function",
          name: "balanceOfBatch",
          outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
        },
        {
          inputs: [
            { internalType: "address[]", name: "_owners", type: "address[]" },
            { internalType: "address[]", name: "_tokens", type: "address[]" },
          ],
          stateMutability: "view",
          type: "function",
          name: "batchCSAInfo",
          outputs: [
            {
              internalType: "struct CSUC_Types.CSAInfo[]",
              name: "_csaInfos",
              type: "tuple[]",
              components: [
                { internalType: "address", name: "owner", type: "address" },
                { internalType: "address", name: "token", type: "address" },
                { internalType: "uint256", name: "balance", type: "uint256" },
                { internalType: "uint256", name: "nonce", type: "uint256" },
              ],
            },
          ],
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "feeCollector",
          outputs: [{ internalType: "address", name: "", type: "address" }],
        },
        {
          inputs: [{ internalType: "uint256", name: "_actionId", type: "uint256" }],
          stateMutability: "view",
          type: "function",
          name: "getActionHandlingInfo",
          outputs: [
            {
              internalType: "struct CSUC_Types.ActionHandlingInfo",
              name: "",
              type: "tuple",
              components: [
                {
                  internalType: "uint16",
                  name: "mandatoryFeePoints",
                  type: "uint16",
                },
                { internalType: "address", name: "handler", type: "address" },
              ],
            },
          ],
        },
        {
          inputs: [
            { internalType: "uint256", name: "_actionId", type: "uint256" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
          name: "getMandatoryFee",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "function",
          name: "initialize",
        },
        {
          inputs: [
            { internalType: "address", name: "account", type: "address" },
            { internalType: "address", name: "operator", type: "address" },
          ],
          stateMutability: "view",
          type: "function",
          name: "isApprovedForAll",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_owner", type: "address" },
            { internalType: "address", name: "_token", type: "address" },
          ],
          stateMutability: "view",
          type: "function",
          name: "nonceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "operator",
          outputs: [{ internalType: "address", name: "", type: "address" }],
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.Action[]",
              name: "_actions",
              type: "tuple[]",
              components: [
                { internalType: "address", name: "from", type: "address" },
                { internalType: "uint8", name: "signature_v", type: "uint8" },
                {
                  internalType: "bytes32",
                  name: "signature_r",
                  type: "bytes32",
                },
                {
                  internalType: "bytes32",
                  name: "signature_s",
                  type: "bytes32",
                },
                {
                  internalType: "struct CSUC_Types.ActionPayload",
                  name: "payload",
                  type: "tuple",
                  components: [
                    { internalType: "address", name: "token", type: "address" },
                    {
                      internalType: "uint256",
                      name: "actionId",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amount",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "totalFee",
                      type: "uint256",
                    },
                    { internalType: "uint256", name: "limit", type: "uint256" },
                    {
                      internalType: "bytes",
                      name: "parameters",
                      type: "bytes",
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "operatorExecute",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "owner",
          outputs: [{ internalType: "address", name: "", type: "address" }],
        },
        {
          inputs: [],
          stateMutability: "view",
          type: "function",
          name: "proxiableUUID",
          outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        },
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "function",
          name: "renounceOwnership",
        },
        {
          inputs: [
            { internalType: "address", name: "_from", type: "address" },
            { internalType: "address", name: "_to", type: "address" },
            { internalType: "uint256[]", name: "_ids", type: "uint256[]" },
            { internalType: "uint256[]", name: "_values", type: "uint256[]" },
            { internalType: "bytes", name: "_data", type: "bytes" },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "safeBatchTransferFrom",
        },
        {
          inputs: [
            { internalType: "address", name: "_from", type: "address" },
            { internalType: "address", name: "_to", type: "address" },
            { internalType: "uint256", name: "_id", type: "uint256" },
            { internalType: "uint256", name: "_value", type: "uint256" },
            { internalType: "bytes", name: "", type: "bytes" },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "safeTransferFrom",
        },
        {
          inputs: [
            { internalType: "address", name: "operator", type: "address" },
            { internalType: "bool", name: "approved", type: "bool" },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "setApprovalForAll",
        },
        {
          inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
          stateMutability: "view",
          type: "function",
          name: "supportsInterface",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
          stateMutability: "nonpayable",
          type: "function",
          name: "transferOwnership",
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.Action",
              name: "_action",
              type: "tuple",
              components: [
                { internalType: "address", name: "from", type: "address" },
                { internalType: "uint8", name: "signature_v", type: "uint8" },
                {
                  internalType: "bytes32",
                  name: "signature_r",
                  type: "bytes32",
                },
                {
                  internalType: "bytes32",
                  name: "signature_s",
                  type: "bytes32",
                },
                {
                  internalType: "struct CSUC_Types.ActionPayload",
                  name: "payload",
                  type: "tuple",
                  components: [
                    { internalType: "address", name: "token", type: "address" },
                    {
                      internalType: "uint256",
                      name: "actionId",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "amount",
                      type: "uint256",
                    },
                    {
                      internalType: "uint256",
                      name: "totalFee",
                      type: "uint256",
                    },
                    { internalType: "uint256", name: "limit", type: "uint256" },
                    {
                      internalType: "bytes",
                      name: "parameters",
                      type: "bytes",
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "unwrap",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [
            {
              internalType: "struct CSUC_Types.ConfigUpdate",
              name: "_update",
              type: "tuple",
              components: [
                {
                  internalType: "address",
                  name: "newOperator",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "newFeeCollector",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "newAggregator",
                  type: "address",
                },
                {
                  internalType: "struct CSUC_Types.ActionHandlingInfoUpdate[]",
                  name: "actionHandlingInfoUpdate",
                  type: "tuple[]",
                  components: [
                    {
                      internalType: "uint256",
                      name: "actionId",
                      type: "uint256",
                    },
                    {
                      internalType: "struct CSUC_Types.ActionHandlingInfo",
                      name: "info",
                      type: "tuple",
                      components: [
                        {
                          internalType: "uint16",
                          name: "mandatoryFeePoints",
                          type: "uint16",
                        },
                        {
                          internalType: "address",
                          name: "handler",
                          type: "address",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "updateConfig",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newImplementation",
              type: "address",
            },
            { internalType: "bytes", name: "data", type: "bytes" },
          ],
          stateMutability: "payable",
          type: "function",
          name: "upgradeToAndCall",
        },
        {
          inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
          name: "uri",
          outputs: [{ internalType: "string", name: "", type: "string" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_to", type: "address" },
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
          ],
          stateMutability: "payable",
          type: "function",
          name: "wrap",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [
            { internalType: "address", name: "_to", type: "address" },
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
          ],
          stateMutability: "nonpayable",
          type: "function",
          name: "wrapERC20",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
        {
          inputs: [{ internalType: "address", name: "_to", type: "address" }],
          stateMutability: "payable",
          type: "function",
          name: "wrapNative",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
        },
      ],
      devdoc: {
        kind: "dev",
        methods: {
          "_hashActionPayload(address,(address,uint256,uint256,uint256,uint256,bytes))": {
            details:
              "This function is used to create a unique hash for the action payload, that      can be signed by the User's CSA. Its visibility is public to allow for easier      testing and debugging.",
            params: {
              _from: "The address of the User's CSA.",
              _payload: "The action payload containing the action details.",
            },
            returns: { _hash: "Returns the hash of the action payload." },
          },
          "_hashActionPayloadWithCustomNonce((address,uint256,uint256,uint256,uint256,bytes),uint256)": {
            details:
              "This function is used to create a unique hash for the action payload, that      can be signed by the User's CSA. Its visibility is public to allow for easier      testing and debugging.",
            params: {
              _nonce: "The custom nonce to be used in the hash.",
              _payload: "The action payload containing the action details.",
            },
            returns: { _hash: "Returns the hash of the action payload." },
          },
          "actionIsActive(uint256)": {
            details:
              "After adding a new custom action, there is a time delay before it becomes active, and can be invoked.",
            returns: { _0: "Returns whether the call was successful." },
          },
          "balanceOf(address,address)": {
            params: { _owner: "The User's CSA.", _token: "The token address." },
            returns: { _0: "Returns the User's CSA token balance." },
          },
          "balanceOf(address,uint256)": {
            details: "See {IERC1155-balanceOf}.",
          },
          "balanceOfBatch(address[],uint256[])": {
            details: "See {IERC1155-balanceOfBatch}. Requirements: - `accounts` and `ids` must have the same length.",
          },
          "batchCSAInfo(address[],address[])": {
            params: {
              _owners: "The User's CSA owner addresses.",
              _tokens: "The token address used for the User's CSAs.",
            },
            returns: { _csaInfos: "Returns the User's CSA information." },
          },
          "getActionHandlingInfo(uint256)": {
            details:
              "This function provides details about how a specific action is handled, including the handler address and any additional parameters.",
            params: {
              _actionId: "The ID of the action for which the handling info is requested.",
            },
            returns: { _0: "Returns the action handling info." },
          },
          "getMandatoryFee(uint256,uint256)": {
            details: "The fee is calculated based on the action ID and the amount of tokens involved.",
            params: {
              _actionId: "The ID of the action for which the fee is being calculated.",
              _amount: "The amount of tokens involved in the action.",
            },
            returns: { _0: "Returns the mandatory fee for the action." },
          },
          "isApprovedForAll(address,address)": {
            details: "See {IERC1155-isApprovedForAll}.",
          },
          "nonceOf(address,address)": {
            params: { _owner: "The User's CSA.", _token: "The token address." },
            returns: { _0: "Returns the User's CSA token balance." },
          },
          "operatorExecute((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes))[])": {
            details:
              "This function allows the `operator` to execute multiple actions in a single transaction.      The actions must be valid. Invalid actions will passed over.",
            params: { _actions: "An array of User actions to be executed." },
            returns: {
              _0: "Returns the number of successfully executed actions.",
            },
          },
          "owner()": { details: "Returns the address of the current owner." },
          "proxiableUUID()": {
            details:
              "Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation's compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.",
          },
          "renounceOwnership()": {
            details:
              "Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.",
          },
          "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)": {
            details: "See {IERC1155-safeBatchTransferFrom}.",
          },
          "safeTransferFrom(address,address,uint256,uint256,bytes)": {
            details: "See {IERC1155-safeTransferFrom}.",
          },
          "setApprovalForAll(address,bool)": {
            details: "See {IERC1155-setApprovalForAll}.",
          },
          "supportsInterface(bytes4)": {
            details: "See {IERC165-supportsInterface}.",
          },
          "transferOwnership(address)": {
            details:
              "Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.",
          },
          "unwrap((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))": {
            params: {
              _action: "The action containing all of the necessary info.",
            },
            returns: { _0: "Returns whether the call was successful." },
          },
          "updateConfig((address,address,address,(uint256,(uint16,address))[]))": {
            details:
              "This function allows the protocol's `owner` to update the existing action handling fields,      as well as the `fee collector` / `operator` address, and to add new actions to the CSUC.",
            returns: { _0: "Returns whether the call was successful." },
          },
          "upgradeToAndCall(address,bytes)": {
            "custom:oz-upgrades-unsafe-allow-reachable": "delegatecall",
            details:
              "Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.",
          },
          "uri(uint256)": {
            details:
              "See {IERC1155MetadataURI-uri}. This implementation returns the same URI for *all* token types. It relies on the token type ID substitution mechanism https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the ERC]. Clients calling this function must replace the `\\{id\\}` substring with the actual token type ID.",
          },
          "wrap(address,address,uint256)": {
            details:
              "This function allows passing a native token as `msg.value` that will be also added to the User's CSA balance.",
            params: { _to: "The User's CSA.", _token: "The token address." },
            returns: { _0: "Returns whether the call was successful." },
          },
          "wrapERC20(address,address,uint256)": {
            details:
              "This function requires that the `msg.sender` has already approved the CSUC contract to spend the token.",
            params: { _to: "The User's CSA.", _token: "The token address." },
            returns: { _0: "Returns whether the call was successful." },
          },
          "wrapNative(address)": {
            details: "Amount is passed as `msg.value`, and the User's CSA balance is updated accordingly.",
            params: { _to: "The User's CSA." },
            returns: { _0: "Returns whether the call was successful." },
          },
        },
        version: 1,
      },
      userdoc: {
        kind: "user",
        methods: {
          "_hashActionPayload(address,(address,uint256,uint256,uint256,uint256,bytes))": {
            notice: "Hashes the action payload with the User's address and the current nonce.",
          },
          "_hashActionPayloadWithCustomNonce((address,uint256,uint256,uint256,uint256,bytes),uint256)": {
            notice: "Hashes the action payload with the User's address and a custom nonce.",
          },
          "actionBecomesActiveAt(uint256)": {
            notice: "notice The mapping of action IDs to the block number when they become active.",
          },
          "actionInfo(uint256)": {
            notice: "notice The mapping of action IDs to their handling info.",
          },
          "actionIsActive(uint256)": {
            notice: "Returns the indication whether a specific action is active.",
          },
          "aggregator()": {
            notice: "notice The address of the Aggregator contract that interacts with CSUC.",
          },
          "balanceAndNonce(address,address)": {
            notice:
              "notice The mapping of User's CSA balances and nonces. dev The mapping is structured as mapping[token][owner] = packedBalanceAndNonce.",
          },
          "balanceOf(address,address)": {
            notice: "Returns the User's CSA token balance;",
          },
          "batchCSAInfo(address[],address[])": {
            notice: "Returns the User's CSA information for a given owner and token.",
          },
          "feeCollector()": {
            notice: "notice The fee collector address that receives all action fees.",
          },
          "getActionHandlingInfo(uint256)": {
            notice: "Returns the action handling info for a given action ID.",
          },
          "getMandatoryFee(uint256,uint256)": {
            notice: "Returns the mandatory fee for a given action.",
          },
          "nonceOf(address,address)": {
            notice: "Returns the User's CSA token balance;",
          },
          "operator()": {
            notice: "notice The operator address that can execute actions on behalf of Users.",
          },
          "operatorExecute((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes))[])": {
            notice: "Executes a bundle of User actions.",
          },
          "unwrap((address,uint8,bytes32,bytes32,(address,uint256,uint256,uint256,uint256,bytes)))": {
            notice: "Unwraps (Withdraws) a passed token from CSA's balance to the desired destination.",
          },
          "updateConfig((address,address,address,(uint256,(uint16,address))[]))": {
            notice: "Updates the protocol's on-chain configuration.",
          },
          "wrap(address,address,uint256)": {
            notice: "Wraps a passed token, and adds it to the User's CSA balance.",
          },
          "wrapERC20(address,address,uint256)": {
            notice: "Wraps a passed token, and adds it to the User's CSA balance.",
          },
          "wrapNative(address)": {
            notice: "Wraps a native token (i.e. Ether), and adds it to the User's CSA balance.",
          },
        },
        version: 1,
      },
    },
    settings: {
      remappings: [
        '"@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/',
        "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/",
        "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
        "erc4626-tests/=lib/openzeppelin-contracts-upgradeable/lib/erc4626-tests/",
        "forge-std/=lib/forge-std/src/",
        "halmos-cheatcodes/=lib/openzeppelin-contracts-upgradeable/lib/halmos-cheatcodes/src/",
        "openzeppelin-contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/",
        "openzeppelin-contracts/=lib/openzeppelin-contracts/",
        "poseidon-solidity/=lib/poseidon-solidity/contracts/",
      ],
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: "none", appendCBOR: false },
      compilationTarget: { "src/csuc/CSUC.sol": "CSUC" },
      evmVersion: "cancun",
      libraries: {},
    },
    sources: {
      "lib/openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol": {
        keccak256: "0xc163fcf9bb10138631a9ba5564df1fa25db9adff73bd9ee868a8ae1858fe093a",
        urls: [
          "bzz-raw://9706d43a0124053d9880f6e31a59f31bc0a6a3dc1acd66ce0a16e1111658c5f6",
          "dweb:/ipfs/QmUFmfowzkRwGtDu36cXV9SPTBHJ3n7dG9xQiK5B28jTf2",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol": {
        keccak256: "0xdb4d24ee2c087c391d587cd17adfe5b3f9d93b3110b1388c2ab6c7c0ad1dcd05",
        urls: [
          "bzz-raw://ab7b6d5b9e2b88176312967fe0f0e78f3d9a1422fa5e4b64e2440c35869b5d08",
          "dweb:/ipfs/QmXKYWWyzcLg1B2k7Sb1qkEXgLCYfXecR9wYW5obRzWP1Q",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol": {
        keccak256: "0x574a7451e42724f7de29e2855c392a8a5020acd695169466a18459467d719d63",
        urls: [
          "bzz-raw://5bc189f63b639ee173dd7b6fecc39baf7113bf161776aea22b34c57fdd1872ec",
          "dweb:/ipfs/QmZAf2VtjDLRULqjJkde6LNsxAg12tUqpPqgUQQZbAjgtZ",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts-upgradeable/contracts/token/ERC1155/ERC1155Upgradeable.sol": {
        keccak256: "0x3a0d63838dff3fd8b77c8c44ecf37cc39b15f26fd5269da3b690879478fa3cf3",
        urls: [
          "bzz-raw://502cec8d2ef132cce69840b1c2aef2209092554292a50d628b27477ef7a441ca",
          "dweb:/ipfs/QmaSxcHDndhVuWm4E6LcSMRkhFYsMXxrgLWMLCQnyG3qHr",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol": {
        keccak256: "0xdbef5f0c787055227243a7318ef74c8a5a1108ca3a07f2b3a00ef67769e1e397",
        urls: [
          "bzz-raw://08e39f23d5b4692f9a40803e53a8156b72b4c1f9902a88cd65ba964db103dab9",
          "dweb:/ipfs/QmPKn6EYDgpga7KtpkA8wV2yJCYGMtc9K4LkJfhKX2RVSV",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol": {
        keccak256: "0xc8ed8d2056934b7675b695dec032f2920c2f5c6cf33a17ca85650940675323ab",
        urls: [
          "bzz-raw://3c8ccc75d1cd792d192aa09e54dd49ea35fe85baa9fcd17486f29227d9f29b89",
          "dweb:/ipfs/QmbboSbFUEiM9tdEgBwuTRb7bykFoJXZ7dsSr1PSREJXMr",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol": {
        keccak256: "0x9b6b3e7803bc5f2f8cd7ad57db8ac1def61a9930a5a3107df4882e028a9605d7",
        urls: [
          "bzz-raw://da62d6be1f5c6edf577f0cb45666a8aa9c2086a4bac87d95d65f02e2f4c36a4b",
          "dweb:/ipfs/QmNkpvBpoCMvX8JwAFNSc5XxJ2q5BXJpL5L1txb4QkqVFF",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol": {
        keccak256: "0xde7e9fd9aee8d4f40772f96bb3b58836cbc6dfc0227014a061947f8821ea9724",
        urls: [
          "bzz-raw://11fea9f8bc98949ac6709f0c1699db7430d2948137aa94d5a9e95a91f61a710a",
          "dweb:/ipfs/QmQdfRXxQjwP6yn3DVo1GHPpriKNcFghSPi94Z1oKEFUNS",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/IERC1967.sol": {
        keccak256: "0xb25a4f11fa80c702bf5cd85adec90e6f6f507f32f4a8e6f5dbc31e8c10029486",
        urls: [
          "bzz-raw://6917f8a323e7811f041aecd4d9fd6e92455a6fba38a797ac6f6e208c7912b79d",
          "dweb:/ipfs/QmShuYv55wYHGi4EFkDB8QfF7ZCHoKk2efyz3AWY1ExSq7",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol": {
        keccak256: "0xce41876e78d1badc0512229b4d14e4daf83bc1003d7f83978d18e0e56f965b9c",
        urls: [
          "bzz-raw://a2608291cb038b388d80b79a06b6118a42f7894ff67b7da10ec0dbbf5b2973ba",
          "dweb:/ipfs/QmWohqcBLbcxmA4eGPhZDXe5RYMMEEpFq22nfkaUMvTfw1",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/draft-IERC1822.sol": {
        keccak256: "0xc42facb5094f2f35f066a7155bda23545e39a3156faef3ddc00185544443ba7d",
        urls: [
          "bzz-raw://d3b36282ab029b46bd082619a308a2ea11c309967b9425b7b7a6eb0b0c1c3196",
          "dweb:/ipfs/QmP2YVfDB2FoREax3vJu7QhDnyYRMw52WPrCD4vdT2kuDA",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol": {
        keccak256: "0x880da465c203cec76b10d72dbd87c80f387df4102274f23eea1f9c9b0918792b",
        urls: [
          "bzz-raw://399594cd8bb0143bc9e55e0f1d071d0d8c850a394fb7a319d50edd55d9ed822b",
          "dweb:/ipfs/QmbPZzgtT6LEm9CMqWfagQFwETbV1ztpECBB1DtQHrKiRz",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Utils.sol": {
        keccak256: "0x8decfa54cec979c824b044b8128cd91d713f72c71fd7dfa54974624d8c949898",
        urls: [
          "bzz-raw://271f914261a19d87117a777e0924ada545c16191ef9b00cc40b0134fc14ebc70",
          "dweb:/ipfs/QmdvVNWHGHQrGGPonZJs5NuzTevTjZRM2zayKrDJf7WBA2",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/proxy/beacon/IBeacon.sol": {
        keccak256: "0xc59a78b07b44b2cf2e8ab4175fca91e8eca1eee2df7357b8d2a8833e5ea1f64c",
        urls: [
          "bzz-raw://5aa4f07e65444784c29cd7bfcc2341b34381e4e5b5da9f0c5bd00d7f430e66fa",
          "dweb:/ipfs/QmWRMh4Q9DpaU9GvsiXmDdoNYMyyece9if7hnfLz7uqzWM",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol": {
        keccak256: "0x22933f0f4897ff70a991c3baebfbc2574fd052dc4bae7fcafec45b07c1f23dd3",
        urls: [
          "bzz-raw://13674cffad18cec55f013056496d7d2e3a34bd7bdbe23d1ef0c7588088c73367",
          "dweb:/ipfs/QmcBkrwxNvCApG48Gyby2L6qCNtuhaFncGpbJt3zuukTmu",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol": {
        keccak256: "0x1d7a05b3219532ea5ece50a80cf390cac9109dc74e07763adfa463ab5a3af0dc",
        urls: [
          "bzz-raw://687e2ec572d0e63827bb0025b91f2246be4c938f830ef4b4c288ee2e3727d5ca",
          "dweb:/ipfs/QmZXWSAQ9ftVrqNEa5ZTpN4wxvzCgsSW12cgiSRkrLTpQ8",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155Receiver.sol": {
        keccak256: "0x61a23d601c2ab69dd726ac55058604cbda98e1d728ba31a51c379a3f9eeea715",
        urls: [
          "bzz-raw://d8cbb06152d82ebdd5ba1d33454e5759492040f309a82637c7e99c948a04fa20",
          "dweb:/ipfs/QmQQuLr6WSfLu97pMEh6XLefk99TSj9k5Qu1zXGPepwGiK",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol": {
        keccak256: "0x35d120c427299af1525aaf07955314d9e36a62f14408eb93dec71a2e001f74d3",
        urls: [
          "bzz-raw://743e38acf441eece428c008be399c40a3ca5b2d595d58faf656cbdbac1a45374",
          "dweb:/ipfs/QmcWDuWkndox3dxa5P7ZgpKy3iuQKkxBq1cR9hPV1ZzAfa",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC1155/utils/ERC1155Utils.sol": {
        keccak256: "0x22f099c02c252dd1f6ddc464916ce683294a63b23b3c6ee3d290b77398e2474b",
        urls: [
          "bzz-raw://82d2ba4b77ecc4f70211e0de1a920e3ea29eb86c3e16ef8f2a7d746c72a97f1e",
          "dweb:/ipfs/QmYBqATARQEnxd33jW6iYCuEPaL6KdYyYSoQrjFXZka3of",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol": {
        keccak256: "0xe06a3f08a987af6ad2e1c1e774405d4fe08f1694b67517438b467cecf0da0ef7",
        urls: [
          "bzz-raw://df6f0c459663c9858b6cba2cda1d14a7d05a985bed6d2de72bd8e78c25ee79db",
          "dweb:/ipfs/QmeTTxZ7qVk9rjEv2R4CpCwdf8UMCcRqDNMvzNxHc3Fnn9",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol": {
        keccak256: "0x982c5cb790ab941d1e04f807120a71709d4c313ba0bfc16006447ffbd27fbbd5",
        urls: [
          "bzz-raw://8150ceb4ac947e8a442b2a9c017e01e880b2be2dd958f1fa9bc405f4c5a86508",
          "dweb:/ipfs/QmbcBmFX66AY6Kbhnd5gx7zpkgqnUafo43XnmayAM7zVdB",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Address.sol": {
        keccak256: "0xaaa1d17c1129b127a4a401db2fbd72960e2671474be3d08cae71ccdc42f7624c",
        urls: [
          "bzz-raw://cb2f27cd3952aa667e198fba0d9b7bcec52fbb12c16f013c25fe6fb52b29cc0e",
          "dweb:/ipfs/QmeuohBFoeyDPZA9JNCTEDz3VBfBD4EABWuWXVhHAuEpKR",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Arrays.sol": {
        keccak256: "0x55a4fdb408e3db950b48f4a6131e538980be8c5f48ee59829d92d66477140cd6",
        urls: [
          "bzz-raw://3e1ad251e692822ce1494135a4ecb5b97c19b90aa82418fd2959ce32017953fd",
          "dweb:/ipfs/QmT6N7mf6heZYhY2BAQ5kwZp9o3SXzGVdkMqUszx67WRDN",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Comparators.sol": {
        keccak256: "0x302eecd8cf323b4690e3494a7d960b3cbce077032ab8ef655b323cdd136cec58",
        urls: [
          "bzz-raw://49ba706f1bc476d68fe6c1fad75517acea4e9e275be0989b548e292eb3a3eacd",
          "dweb:/ipfs/QmeBpvcdGWzWMKTQESUCEhHgnEQYYATVwPxLMxa6vMT7jC",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Context.sol": {
        keccak256: "0x493033a8d1b176a037b2cc6a04dad01a5c157722049bbecf632ca876224dd4b2",
        urls: [
          "bzz-raw://6a708e8a5bdb1011c2c381c9a5cfd8a9a956d7d0a9dc1bd8bcdaf52f76ef2f12",
          "dweb:/ipfs/Qmax9WHBnVsZP46ZxEMNRQpLQnrdE4dK8LehML1Py8FowF",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Errors.sol": {
        keccak256: "0x6afa713bfd42cf0f7656efa91201007ac465e42049d7de1d50753a373648c123",
        urls: [
          "bzz-raw://ba1d02f4847670a1b83dec9f7d37f0b0418d6043447b69f3a29a5f9efc547fcf",
          "dweb:/ipfs/QmQ7iH2keLNUKgq2xSWcRmuBE5eZ3F5whYAkAGzCNNoEWB",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/Panic.sol": {
        keccak256: "0xf7fe324703a64fc51702311dc51562d5cb1497734f074e4f483bfb6717572d7a",
        urls: [
          "bzz-raw://c6a5ff4f9fd8649b7ee20800b7fa387d3465bd77cf20c2d1068cd5c98e1ed57a",
          "dweb:/ipfs/QmVSaVJf9FXFhdYEYeCEfjMVHrxDh5qL4CGkxdMWpQCrqG",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol": {
        keccak256: "0x11a5a79827df29e915a12740caf62fe21ebe27c08c9ae3e09abe9ee3ba3866d3",
        urls: [
          "bzz-raw://3cf0c69ab827e3251db9ee6a50647d62c90ba580a4d7bbff21f2bea39e7b2f4a",
          "dweb:/ipfs/QmZiKwtKU1SBX4RGfQtY7PZfiapbbu6SZ9vizGQD9UHjRA",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/SlotDerivation.sol": {
        keccak256: "0x67672e4ca1dafdcc661d4eba8475cfac631fa0933309258e3af7644b92e1fb26",
        urls: [
          "bzz-raw://30192451f05ea5ddb0c18bd0f9003f098505836ba19c08a9c365adf829454da2",
          "dweb:/ipfs/QmfCuZSCTyCdFoSKn7MSaN6hZksnQn9ZhrZDAdRTCbwGu2",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol": {
        keccak256: "0xcf74f855663ce2ae00ed8352666b7935f6cddea2932fdf2c3ecd30a9b1cd0e97",
        urls: [
          "bzz-raw://9f660b1f351b757dfe01438e59888f31f33ded3afcf5cb5b0d9bf9aa6f320a8b",
          "dweb:/ipfs/QmarDJ5hZEgBtCmmrVzEZWjub9769eD686jmzb2XpSU1cM",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol": {
        keccak256: "0x69f54c02b7d81d505910ec198c11ed4c6a728418a868b906b4a0cf29946fda84",
        urls: [
          "bzz-raw://8e25e4bdb7ae1f21d23bfee996e22736fc0ab44cfabedac82a757b1edc5623b9",
          "dweb:/ipfs/QmQdWQvB6JCP9ZMbzi8EvQ1PTETqkcTWrbcVurS7DKpa5n",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/introspection/ERC165.sol": {
        keccak256: "0xddce8e17e3d3f9ed818b4f4c4478a8262aab8b11ed322f1bf5ed705bb4bd97fa",
        urls: [
          "bzz-raw://8084aa71a4cc7d2980972412a88fe4f114869faea3fefa5436431644eb5c0287",
          "dweb:/ipfs/Qmbqfs5dRdPvHVKY8kTaeyc65NdqXRQwRK7h9s5UJEhD1p",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol": {
        keccak256: "0x79796192ec90263f21b464d5bc90b777a525971d3de8232be80d9c4f9fb353b8",
        urls: [
          "bzz-raw://f6fda447a62815e8064f47eff0dd1cf58d9207ad69b5d32280f8d7ed1d1e4621",
          "dweb:/ipfs/QmfDRc7pxfaXB2Dh9np5Uf29Na3pQ7tafRS684wd3GLjVL",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/math/Math.sol": {
        keccak256: "0x1225214420c83ebcca88f2ae2b50f053aaa7df7bd684c3e878d334627f2edfc6",
        urls: [
          "bzz-raw://6c5fab4970634f9ab9a620983dc1c8a30153981a0b1a521666e269d0a11399d3",
          "dweb:/ipfs/QmVRnBC575MESGkEHndjujtR7qub2FzU9RWy9eKLp4hPZB",
        ],
        license: "MIT",
      },
      "lib/openzeppelin-contracts/contracts/utils/math/SafeCast.sol": {
        keccak256: "0x195533c86d0ef72bcc06456a4f66a9b941f38eb403739b00f21fd7c1abd1ae54",
        urls: [
          "bzz-raw://b1d578337048cad08c1c03041cca5978eff5428aa130c781b271ad9e5566e1f8",
          "dweb:/ipfs/QmPFKL2r9CBsMwmUqqdcFPfHZB2qcs9g1HDrPxzWSxomvy",
        ],
        license: "MIT",
      },
      "src/csuc/CSUC.sol": {
        keccak256: "0xe3aecf112aa0c5e0d5673b728409f2d6ee7b168cb20117febbbb123cc48b0e42",
        urls: [
          "bzz-raw://95f628ec99a32dca55b037433ad77615dbf39332e58a3f2a7d7387e5c3ea6c1b",
          "dweb:/ipfs/QmYANcfiUTC5HQGGTeTwrvGC7hfrXgkpA2wngF8oGrVRz5",
        ],
        license: "BUSL-1.1",
      },
      "src/csuc/interfaces/ICSUC.sol": {
        keccak256: "0x928463af014fd0db59b4a3d1896de40d7580f954ffbaaff80e16278200ab46b8",
        urls: [
          "bzz-raw://7756ee26537ae6cf49c8edbbd889f2c5ec17ac645be67613fa7b2d133f8e437d",
          "dweb:/ipfs/QmdSCEV2aQgYnJeEQwNEmFmNBzYaDHWpHK38fhrERPRJMo",
        ],
        license: "BUSL-1.1",
      },
      "src/csuc/interfaces/ICSUC_ActionHandler.sol": {
        keccak256: "0x23a28b0c983b7c97d0894442250b71a47e99aeb90cfaf6bbdf11499cae69df26",
        urls: [
          "bzz-raw://dcfebcd0cfea5e814e1da338232e23ac94ad4e667620d087705367994b7e5554",
          "dweb:/ipfs/QmT9nH7YVAhPzK6tjNbhiZvTpeVXBEu8gc7sDh3YWtzQyG",
        ],
        license: "BUSL-1.1",
      },
      "src/csuc/utils/_Constants.sol": {
        keccak256: "0x7ae111eb16ac0bdef57f84ed586c46a4f061aaa64abe2f136d990f47065b020e",
        urls: [
          "bzz-raw://9a647e257e4f00d793f3bc5be66d91fbf92db9a0b4715073ce3e050aa07fc0a8",
          "dweb:/ipfs/QmarJwgCGm3vtyVjkNvyLc18ESisaEXPnexTWnE29Qikjj",
        ],
        license: "BUSL-1.1",
      },
      "src/csuc/utils/_Types.sol": {
        keccak256: "0xda01b2068e2f7ef0938ab27a0cf861f2c08df319dace834adf3960cba8fb5f8c",
        urls: [
          "bzz-raw://db81ec4a16b12ed2f545042107add2b289b05eb7bf33002ee39847e7d127b48d",
          "dweb:/ipfs/QmYVG9M9qVzTNF3xKBaTkW94MzpiH42WQ9nmuBfwXe3jUW",
        ],
        license: "BUSL-1.1",
      },
    },
    version: 1,
  },
  id: 60,
} as const;
