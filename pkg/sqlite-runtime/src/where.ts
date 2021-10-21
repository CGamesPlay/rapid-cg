import SQL from "./tag.js";

type WhereScalar<T extends string | number | bigint> = {
  equals?: T | null;
  not?: T | null;
  gt?: T;
  lt?: T;
  gte?: T;
  lte?: T;
  in?: T[];
  notIn?: T[];
};

const comparisonOps = {
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
};

function makeWhereScalar<T extends string | number | bigint>(
  column: string,
  where: WhereScalar<T>
): SQL.Template[] {
  const parts: SQL.Template[] = [];
  if ("equals" in where) {
    if (where.equals === null) {
      parts.push(SQL`${SQL.id(column)} IS NULL`);
    } else {
      parts.push(SQL`${SQL.id(column)} = ${where.equals}`);
    }
  }
  if ("not" in where) {
    if (where.not === null) {
      parts.push(SQL`${SQL.id(column)} IS NOT NULL`);
    } else {
      parts.push(SQL`${SQL.id(column)} != ${where.not}`);
    }
  }
  let key: keyof typeof comparisonOps;
  for (key in comparisonOps) {
    if (key in where) {
      parts.push(
        SQL`${SQL.id(column)} ${SQL.raw(comparisonOps[key])} ${where[key]}`
      );
    }
  }
  if ("in" in where) {
    parts.push(SQL`${SQL.id(column)} IN ( ${SQL.join(where.in!, ", ")} )`);
  }
  if ("notIn" in where) {
    parts.push(
      SQL`${SQL.id(column)} NOT IN ( ${SQL.join(where.notIn!, ", ")} )`
    );
  }
  return parts;
}

export type WhereString = string | (WhereScalar<string> & { like?: string });

export function makeWhereString(
  column: string,
  where: WhereString
): SQL.Template {
  if (typeof where === "string") {
    where = { equals: where };
  }
  const parts: SQL.Template[] = makeWhereScalar(column, where);
  if ("like" in where) {
    parts.push(SQL`${SQL.id(column)} LIKE ${where.like}`);
  }
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export type WhereNumber = number | bigint | WhereScalar<number | bigint>;

export function makeWhereNumber(
  column: string,
  where: WhereNumber
): SQL.Template {
  if (typeof where === "number" || typeof where === "bigint") {
    where = { equals: where };
  }
  const parts: SQL.Template[] = makeWhereScalar(column, where);
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}
