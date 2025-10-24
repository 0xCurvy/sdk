import { keccak256 } from "ethers";
import { encodeAbiParameters, encodePacked, parseAbiParameters } from "viem";
import type { HexString } from "@/types";

export function getMetaTransactionEip712HashAndSignedData(
  fromAddress: HexString,
  toAddress: HexString,
  tokenId: number,
  effectiveAmount: bigint,
  totalFees: bigint,
  nonce: bigint,
  erc1155ContractAddress: HexString,
  feeCollectorAddress: HexString,
): [eip712Hash: HexString, signedData: HexString] {
  const META_TX_TYPEHASH = "0xce0b514b3931bdbe4d5d44e4f035afe7113767b7db71949271f6a62d9c60f558";
  const encMembers = encodeAbiParameters(parseAbiParameters("bytes32, address, address, uint256, uint256, uint256"), [
    META_TX_TYPEHASH,
    fromAddress,
    toAddress,
    BigInt(tokenId),
    effectiveAmount,
    1n,
  ]);

  // Now we do the gas receipt
  const encodedAddressAndId = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [erc1155ContractAddress, BigInt(tokenId)],
  );

  const feeTokenData = encodePacked(["bytes", "uint8"], [encodedAddressAndId, 0]); // 0 for ERC1155

  const gasReceipt = {
    gasFee: totalFees,
    gasLimitCallback: 0n,
    feeRecipient: feeCollectorAddress,
    feeTokenData: feeTokenData,
  };

  const signedData = encodeAbiParameters(
    [
      {
        type: "tuple",
        name: "gasReceipt",
        components: [
          { name: "gasFee", type: "uint256" },
          { name: "gasLimitCallback", type: "uint256" },
          { name: "feeRecipient", type: "address" },
          { name: "feeTokenData", type: "bytes" },
        ],
      },
      { name: "transferData", type: "bytes" },
    ],
    [gasReceipt, "0x"], // Assuming no extra transferData
  );

  const structHash = keccak256(
    encodePacked(["bytes", "uint256", "bytes32"], [encMembers, nonce, keccak256(signedData) as HexString]),
  ) as HexString;

  // TODO: PRODUCTION READY This domain separator probably doesn't apply to us. Use vanilla signedTypedData if we can
  const DOMAIN_SEPARATOR_TYPEHASH = "0x035aff83d86937d35b32e04f0ddc6ff469290eef2f1b692d8a815c89404d4749";
  const domainSeparator = keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, address"), [DOMAIN_SEPARATOR_TYPEHASH, erc1155ContractAddress]),
  ) as HexString;

  const eip712Hash = keccak256(encodePacked(["bytes2", "bytes32", "bytes32"], ["0x1901", domainSeparator, structHash]));

  return [eip712Hash as HexString, signedData];
}
