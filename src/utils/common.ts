export const jsonStringify = <T>(obj: T): string => {
  return JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v));
};

export const noop = () => void 0;
export const sleep = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};
