import type { Abi } from "starknet";

export const starknetAccountAbi = [
  {
    type: "impl",
    name: "EthAccountMixinImpl",
    interface_name: "openzeppelin_account::interface::EthAccountABI",
  },
  {
    type: "struct",
    name: "core::array::Span::<core::felt252>",
    members: [{ name: "snapshot", type: "@core::array::Array::<core::felt252>" }],
  },
  {
    type: "struct",
    name: "core::starknet::account::Call",
    members: [
      { name: "to", type: "core::starknet::contract_address::ContractAddress" },
      {
        name: "selector",
        type: "core::felt252",
      },
      { name: "calldata", type: "core::array::Span::<core::felt252>" },
    ],
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      { name: "False", type: "()" },
      { name: "True", type: "()" },
    ],
  },
  {
    type: "interface",
    name: "openzeppelin_account::interface::EthAccountABI",
    items: [
      {
        type: "function",
        name: "__execute__",
        inputs: [{ name: "calls", type: "core::array::Array::<core::starknet::account::Call>" }],
        outputs: [{ type: "core::array::Array::<core::array::Span::<core::felt252>>" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "__validate__",
        inputs: [{ name: "calls", type: "core::array::Array::<core::starknet::account::Call>" }],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "is_valid_signature",
        inputs: [
          { name: "hash", type: "core::felt252" },
          {
            name: "signature",
            type: "core::array::Array::<core::felt252>",
          },
        ],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "supports_interface",
        inputs: [{ name: "interface_id", type: "core::felt252" }],
        outputs: [{ type: "core::bool" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "__validate_declare__",
        inputs: [{ name: "class_hash", type: "core::felt252" }],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "__validate_deploy__",
        inputs: [
          { name: "class_hash", type: "core::felt252" },
          {
            name: "contract_address_salt",
            type: "core::felt252",
          },
          { name: "public_key", type: "core::starknet::secp256k1::Secp256k1Point" },
        ],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_public_key",
        inputs: [],
        outputs: [{ type: "core::starknet::secp256k1::Secp256k1Point" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "set_public_key",
        inputs: [
          {
            name: "new_public_key",
            type: "core::starknet::secp256k1::Secp256k1Point",
          },
          { name: "signature", type: "core::array::Span::<core::felt252>" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "isValidSignature",
        inputs: [
          { name: "hash", type: "core::felt252" },
          {
            name: "signature",
            type: "core::array::Array::<core::felt252>",
          },
        ],
        outputs: [{ type: "core::felt252" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "getPublicKey",
        inputs: [],
        outputs: [{ type: "core::starknet::secp256k1::Secp256k1Point" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "setPublicKey",
        inputs: [
          { name: "newPublicKey", type: "core::starknet::secp256k1::Secp256k1Point" },
          {
            name: "signature",
            type: "core::array::Span::<core::felt252>",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [{ name: "public_key", type: "core::starknet::secp256k1::Secp256k1Point" }],
  },
  {
    type: "event",
    name: "openzeppelin_account::eth_account::EthAccountComponent::OwnerAdded",
    kind: "struct",
    members: [{ name: "new_owner_guid", type: "core::felt252", kind: "key" }],
  },
  {
    type: "event",
    name: "openzeppelin_account::eth_account::EthAccountComponent::OwnerRemoved",
    kind: "struct",
    members: [{ name: "removed_owner_guid", type: "core::felt252", kind: "key" }],
  },
  {
    type: "event",
    name: "openzeppelin_account::eth_account::EthAccountComponent::Event",
    kind: "enum",
    variants: [
      {
        name: "OwnerAdded",
        type: "openzeppelin_account::eth_account::EthAccountComponent::OwnerAdded",
        kind: "nested",
      },
      {
        name: "OwnerRemoved",
        type: "openzeppelin_account::eth_account::EthAccountComponent::OwnerRemoved",
        kind: "nested",
      },
    ],
  },
  {
    type: "event",
    name: "openzeppelin_introspection::src5::SRC5Component::Event",
    kind: "enum",
    variants: [],
  },
  {
    type: "event",
    name: "curvy_account::AccountV0::Event",
    kind: "enum",
    variants: [
      {
        name: "EthAccountEvent",
        type: "openzeppelin_account::eth_account::EthAccountComponent::Event",
        kind: "flat",
      },
      { name: "SRC5Event", type: "openzeppelin_introspection::src5::SRC5Component::Event", kind: "flat" },
    ],
  },
] as const satisfies Abi;
