export const jsonStringify = <T>(obj: T): string => {
  return JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v));
};
