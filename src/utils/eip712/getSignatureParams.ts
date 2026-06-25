import type { EvmSignTypedDataParameters } from "@/types/signature";

/**
 * Builds the EIP-712 typed-data parameters for a Curvy Protocol `AuthMessage`,
 * embedding the supplied message into the signature content.
 *
 * Pure and deterministic — the same `messageToSign` always yields the same
 * typed-data structure (fixed `Curvy Protocol` domain on chain id 1).
 *
 * @example
 * const params = getSignatureParams("deadbeef");
 * params.primaryType;            // "AuthMessage"
 * params.domain.name;            // "Curvy Protocol"
 * params.message.content;        // "Curvy Protocol requests signature: deadbeef"
 */
const getSignatureParams = (messageToSign: string) => {
  return {
    domain: {
      name: "Curvy Protocol",
      version: "1.0.0",
      chainId: 1 as const,
    },
    message: {
      title: "Curvy Protocol says 'Zdravo'!",
      content: `Curvy Protocol requests signature: ${messageToSign}`,
    },
    primaryType: "AuthMessage" as const,
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      AuthMessage: [
        {
          name: "title",
          type: "string",
        },
        {
          name: "content",
          type: "string",
        },
      ],
    },
  } satisfies EvmSignTypedDataParameters;
};

export { getSignatureParams };
