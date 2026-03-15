/**
 * Simple slugify:
 * - lowercases
 * - replaces swedish chars
 * - replaces non-alphanum with '-'
 * - trims repeated dashes
 */
export function slugify(input) {
  const s = String(input ?? "").trim().toLowerCase();
  const map = {
    å: "a",
    ä: "a",
    ö: "o",
    é: "e",
  };

  const normalized = s.replace(/[åäöé]/g, (m) => map[m] ?? m);

  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
