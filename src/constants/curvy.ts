const CURVY_ID_DOMAINS = [".staging-curvy.name", ".curvy.name", ".local-curvy.name"] as const;

type CURVY_ID_DOMAINS = (typeof CURVY_ID_DOMAINS)[number];
type EnsCurvyIdDomain = Exclude<CURVY_ID_DOMAINS, ".local-curvy.name">;

export { CURVY_ID_DOMAINS, type EnsCurvyIdDomain };
