import { CURVY_HANDLE_DOMAINS } from "@/constants/curvy";

const CURVY_HANDLE_REGEX = new RegExp(`^[a-zA-Z0-9-]{3,20}(${CURVY_HANDLE_DOMAINS.join("|")})$`);

export { CURVY_HANDLE_REGEX };
