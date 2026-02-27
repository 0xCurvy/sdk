import { CURVY_ID_DOMAINS } from "@/constants/curvy";

const CURVY_ID_REGEX = new RegExp(`^[a-zA-Z0-9-]{3,20}(${CURVY_ID_DOMAINS.join("|")})$`);

export { CURVY_ID_REGEX };
