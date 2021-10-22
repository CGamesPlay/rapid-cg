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
  if (where.equals !== undefined) {
    if (where.equals === null) {
      parts.push(SQL`${SQL.id(column)} IS NULL`);
    } else {
      parts.push(SQL`${SQL.id(column)} = ${where.equals}`);
    }
  }
  if (where.not !== undefined) {
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
  if (where.in !== undefined) {
    parts.push(SQL`${SQL.id(column)} IN ( ${SQL.join(where.in!, ", ")} )`);
  }
  if (where.notIn !== undefined) {
    parts.push(
      SQL`${SQL.id(column)} NOT IN ( ${SQL.join(where.notIn!, ", ")} )`
    );
  }
  return parts;
}

export type WhereString =
  | string
  | null
  | (WhereScalar<string> & { like?: string });

export function makeWhereString(
  column: string,
  where: WhereString
): SQL.Template {
  if (typeof where === "string" || where === null) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = makeWhereScalar(column, where);
  if (where.like !== undefined) {
    parts.push(SQL`${SQL.id(column)} LIKE ${where.like}`);
  }
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export type WhereNumber = number | bigint | null | WhereScalar<number | bigint>;

export function makeWhereNumber(
  column: string,
  where: WhereNumber
): SQL.Template {
  if (
    typeof where === "number" ||
    typeof where === "bigint" ||
    where === null
  ) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = makeWhereScalar(column, where);
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export type WhereChainable<T extends WhereChainable<T>> = {
  AND?: T | T[];
  OR?: T | T[];
  NOT?: T | T[];
};

export function makeWhereChainable<T extends WhereChainable<T>>(
  makeWhereComponent: (component: T) => SQL.Template[]
): (where: T | undefined) => SQL.Template {
  return function makeWhereChained(where: T | undefined): SQL.Template {
    if (where === undefined) return SQL`1 = 1`;
    let andComponents: SQL.Template[] = makeWhereComponent(where);
    if (where.AND !== undefined) {
      if (Array.isArray(where.AND)) {
        andComponents = andComponents.concat(where.AND.map(makeWhereChained));
      } else {
        andComponents.push(makeWhereChained(where.AND));
      }
    }
    if (where.OR !== undefined) {
      let orComponents: SQL.Template[] = [];
      if (Array.isArray(where.OR)) {
        orComponents = orComponents.concat(where.OR.map(makeWhereChained));
      } else {
        orComponents.push(makeWhereChained(where.OR));
      }
      andComponents.push(SQL`( ${SQL.join(orComponents, " OR ")} )`);
    }
    if (where.NOT !== undefined) {
      let notComponents: SQL.Template[] = [];
      if (Array.isArray(where.NOT)) {
        notComponents = notComponents.concat(where.NOT.map(makeWhereChained));
      } else {
        notComponents.push(makeWhereChained(where.NOT));
      }
      andComponents = andComponents.concat(
        notComponents.map((c) => SQL`NOT ( ${c} )`)
      );
    }
    if (andComponents.length > 0) return SQL.join(andComponents, " AND ");
    return SQL`1 = 1`;
  };
}
