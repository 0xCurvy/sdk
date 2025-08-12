import type { StarknetSignTypedDataParameters } from "@/types/signature";

const CURVY_ACCOUNT_CLASS_HASHES = [
  "0x5c3d0c6de131223c3f0c5691bca79047605ed0f241b5f82fdedd3b3bec70d7a",
  "0x76fe16155ba56e21af745f15c85cc989987b74e8bb48af2e7f147991b62c082",
] as const;

const CURVY_DUMMY_STARKNET_ACCOUNT = {
  address: "0x07029501269c0795f5215afed8e012aeec81184355e756c34ada2b235ce85cd5",
  pk: "0x043b0297181e2e6bd8a328e16353f33c2fbcdd3d02141e3ca4d5ab9c3c2b86e5",
};

const getSignatureParams = (messageToSign: string) => {
  return {
    domain: {
      name: "Curvy Protocol",
      chainId: "0x534e5f4d41494e",
      version: "1.0.0",
      revision: "1",
    },
    primaryType: "Simple",
    types: {
      Simple: [
        {
          name: "title",
          type: "shortstring",
        },
        {
          name: "content",
          type: "string",
        },
      ],
      StarknetDomain: [
        {
          name: "name",
          type: "shortstring",
        },
        {
          name: "chainId",
          type: "shortstring",
        },
        {
          name: "version",
          type: "shortstring",
        },
      ],
    },
    message: {
      title: "Curvy Protocol says 'Zdravo'!",
      content: `Curvy Protocol requests signature: ${messageToSign}`,
    },
  } satisfies StarknetSignTypedDataParameters;
};

export { CURVY_ACCOUNT_CLASS_HASHES, CURVY_DUMMY_STARKNET_ACCOUNT, getSignatureParams };
