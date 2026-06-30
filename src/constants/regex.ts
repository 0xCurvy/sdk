import { CURVY_ID_DOMAINS } from "@/constants/curvy";

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CURVY_ID_REGEX = new RegExp(`^[a-zA-Z0-9-]{3,20}(${CURVY_ID_DOMAINS.map(escapeRegExp).join("|")})$`);

export { CURVY_ID_REGEX };
