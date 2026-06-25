import { shaDigest } from "@/utils/hash/shaDigest";

const ACCOUNT_ID_LENGTH = 12;
const generateAccountId = (s: string, v: string) => {
  return shaDigest("SHA-256", JSON.stringify({ s, v }), ACCOUNT_ID_LENGTH);
};

export { generateAccountId };
