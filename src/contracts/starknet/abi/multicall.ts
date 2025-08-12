import type { Abi } from "starknet";

export const starknetMulticallAbi = [
  {
    type: "impl",
    name: "ComposableMulticallImpl",
    interface_name: "composable_multicall::IComposableMulticall",
  },
  {
    type: "enum",
    name: "composable_multicall::Execution",
    variants: [
      { name: "Static", type: "()" },
      {
        name: "IfEqual",
        type: "(core::integer::u32, core::integer::u32, core::felt252)",
      },
      {
        name: "IfNotEqual",
        type: "(core::integer::u32, core::integer::u32, core::felt252)",
      },
    ],
  },
  {
    type: "enum",
    name: "composable_multicall::DynamicFelt",
    variants: [
      { name: "Hardcoded", type: "core::felt252" },
      {
        name: "Reference",
        type: "(core::integer::u32, core::integer::u32)",
      },
    ],
  },
  {
    type: "enum",
    name: "composable_multicall::DynamicCalldata",
    variants: [
      { name: "Hardcoded", type: "core::felt252" },
      {
        name: "Reference",
        type: "(core::integer::u32, core::integer::u32)",
      },
      {
        name: "ArrayReference",
        type: "(core::integer::u32, core::integer::u32)",
      },
    ],
  },
  {
    type: "struct",
    name: "composable_multicall::DynamicCall",
    members: [
      { name: "execution", type: "composable_multicall::Execution" },
      { name: "to", type: "composable_multicall::DynamicFelt" },
      { name: "selector", type: "composable_multicall::DynamicFelt" },
      {
        name: "calldata",
        type: "core::array::Array::<composable_multicall::DynamicCalldata>",
      },
    ],
  },
  {
    type: "struct",
    name: "core::array::Span::<core::felt252>",
    members: [{ name: "snapshot", type: "@core::array::Array::<core::felt252>" }],
  },
  {
    type: "interface",
    name: "composable_multicall::IComposableMulticall",
    items: [
      {
        type: "function",
        name: "aggregate",
        inputs: [
          {
            name: "calls",
            type: "core::array::Array::<composable_multicall::DynamicCall>",
          },
        ],
        outputs: [
          {
            type: "core::array::Array::<core::array::Span::<core::felt252>>",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "event",
    name: "composable_multicall::contract::ComposableMulticall::Event",
    kind: "enum",
    variants: [],
  },
] as const satisfies Abi;
