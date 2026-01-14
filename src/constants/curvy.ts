const CURVY_HANDLE_DOMAINS = [".staging-curvy.name", ".curvy.name", ".local-curvy.name"] as const;

type CURVY_HANDLE_DOMAINS = (typeof CURVY_HANDLE_DOMAINS)[number];
type EnsCurvyHandleDomain = Exclude<CURVY_HANDLE_DOMAINS, ".local-curvy.name">;

export { CURVY_HANDLE_DOMAINS, EnsCurvyHandleDomain };
