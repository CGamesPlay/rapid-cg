import { SQL } from "./tag.js";
import { MaybeArray } from "./utils.js";

export type SortOrder = "asc" | "desc";

export function makeOrderBy<T extends Record<string, SortOrder>>(
  args: MaybeArray<T>
): SQL.Template {
  args = Array.isArray(args) ? args : [args];
  if (args.length === 0) return SQL.empty;
  const clauses = args.map((a) => {
    const cols = Object.keys(a);
    if (cols.length !== 1) throw new Error("invalid orderBy clause");
    const asc = a[cols[0]] === "asc";
    if (asc) return SQL.id(cols[0]);
    return SQL`${SQL.id(cols[0])} DESC`;
  });
  return SQL`ORDER BY ${SQL.join(clauses, ", ")}`;
}
