function toSlug(str: string) {
  return str.replace(" ", "-").toLowerCase();
}

export { toSlug };
