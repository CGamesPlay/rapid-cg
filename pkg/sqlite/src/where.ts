import { z } from "zod";

import SQL from "./tag.js";
import { MaybeArray, Namespace } from "./utils.js";

const WhereScalar = <T extends z.ZodTypeAny>(t: T) =>
  z.object({
    equals: t.nullable().optional(),
    not: t.nullable().optional(),
    gt: t.optional(),
    lt: t.optional(),
    gte: t.optional(),
    lte: t.optional(),
    in: t.array().optional(),
    notIn: t.array().optional(),
  });
type WhereScalar<T> = {
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

function formatWhereScalar<T extends string | number | bigint>(
  column: SQL.Template,
  where: WhereScalar<T>
): SQL.Template[];
function formatWhereScalar<T>(
  column: SQL.Template,
  where: WhereScalar<T>,
  convert: (val: T) => string | number | bigint | SQL.Template
): SQL.Template[];
function formatWhereScalar<T>(
  column: SQL.Template,
  where: WhereScalar<T>,
  convert?: (val: T) => string | number | bigint | SQL.Template
): SQL.Template[] {
  const parts: SQL.Template[] = [];
  const C = convert ?? (((x: any) => x) as any);
  if (where.equals !== undefined) {
    if (where.equals === null) {
      parts.push(SQL`${column} IS NULL`);
    } else {
      parts.push(SQL`${column} = ${C(where.equals)}`);
    }
  }
  if (where.not !== undefined) {
    if (where.not === null) {
      parts.push(SQL`${column} IS NOT NULL`);
    } else {
      parts.push(SQL`${column} != ${C(where.not)}`);
    }
  }
  let key: keyof typeof comparisonOps;
  for (key in comparisonOps) {
    if (key in where) {
      parts.push(
        SQL`${column} ${SQL.raw(comparisonOps[key])} ${C(where[key])}`
      );
    }
  }
  if (where.in !== undefined) {
    parts.push(SQL`${column} IN ( ${SQL.join(where.in!.map(C), ", ")} )`);
  }
  if (where.notIn !== undefined) {
    parts.push(
      SQL`${column} NOT IN ( ${SQL.join(where.notIn!.map(C), ", ")} )`
    );
  }
  return parts;
}

export const WhereString = z.union([
  z.string(),
  z.null(),
  WhereScalar(z.string()).extend({ like: z.string().optional() }),
]);
export type WhereString =
  | string
  | null
  | (WhereScalar<string> & { like?: string });

export function formatWhereString(
  column: SQL.Template,
  where: WhereString
): SQL.Template {
  if (typeof where === "string" || where === null) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = formatWhereScalar(column, where);
  if (where.like !== undefined) {
    parts.push(SQL`${column} LIKE ${where.like}`);
  }
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export const WhereNumber = z.union([
  z.number(),
  z.bigint(),
  z.null(),
  WhereScalar(z.union([z.number(), z.bigint()])),
]);
export type WhereNumber = number | bigint | null | WhereScalar<number | bigint>;

export function formatWhereNumber(
  column: SQL.Template,
  where: WhereNumber
): SQL.Template {
  if (
    typeof where === "number" ||
    typeof where === "bigint" ||
    where === null
  ) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = formatWhereScalar(column, where);
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export const WhereDate = z.union([z.date(), z.null(), WhereScalar(z.date())]);
export type WhereDate = Date | null | WhereScalar<Date>;

export function formatWhereDate(
  column: SQL.Template,
  where: WhereDate
): SQL.Template {
  if (where instanceof Date || where === null) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = formatWhereScalar(column, where, (v) =>
    v.toISOString()
  );
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export const WhereUuid = z.union([
  z.string().uuid(),
  z.null(),
  WhereScalar(z.string().uuid()),
]);
export type WhereUuid = string | null | WhereScalar<string>;

export function formatWhereUuid(
  column: SQL.Template,
  where: WhereUuid
): SQL.Template {
  if (typeof where === "string" || where === null) {
    where = { equals: where };
  }
  const parts: SQL.Template[] = formatWhereScalar(column, where);
  if (parts.length === 0) return SQL`1 = 1`;
  return SQL.join(parts, " AND ");
}

export type WhereChainable<T extends WhereChainable<T>> = {
  AND?: MaybeArray<T>;
  OR?: MaybeArray<T>;
  NOT?: MaybeArray<T>;
};

export function makeWhereChainable<T extends WhereChainable<T>>(
  makeWhereComponent: (nsr: Namespace.Result, component: T) => SQL.Template[]
): (nsr: Namespace.Result, where: T | undefined) => SQL.Template {
  return function makeWhereChained(
    nsr: Namespace.Result,
    where: T | undefined
  ): SQL.Template {
    if (where === undefined) return SQL`1 = 1`;
    let andComponents: SQL.Template[] = makeWhereComponent(nsr, where);
    if (where.AND !== undefined) {
      if (Array.isArray(where.AND)) {
        andComponents = andComponents.concat(
          where.AND.map((c) => makeWhereChained(nsr, c))
        );
      } else {
        andComponents.push(makeWhereChained(nsr, where.AND));
      }
    }
    if (where.OR !== undefined) {
      let orComponents: SQL.Template[] = [];
      if (Array.isArray(where.OR)) {
        orComponents = orComponents.concat(
          where.OR.map((c) => makeWhereChained(nsr, c))
        );
      } else {
        orComponents.push(makeWhereChained(nsr, where.OR));
      }
      andComponents.push(SQL`( ${SQL.join(orComponents, " OR ")} )`);
    }
    if (where.NOT !== undefined) {
      let notComponents: SQL.Template[] = [];
      if (Array.isArray(where.NOT)) {
        notComponents = notComponents.concat(
          where.NOT.map((c) => makeWhereChained(nsr, c))
        );
      } else {
        notComponents.push(makeWhereChained(nsr, where.NOT));
      }
      andComponents = andComponents.concat(
        notComponents.map((c) => SQL`NOT ( ${c} )`)
      );
    }
    if (andComponents.length > 0) return SQL.join(andComponents, " AND ");
    return SQL`1 = 1`;
  };
}

export type WhereOneRelated<T> = {
  /** The related model satisfies these constraints. */
  is?: T;
  /** The related model does not exist or does not satisfy these constraints. */
  isNot?: T;
};
export const WhereOneRelated = <T extends z.ZodSchema<unknown>>(t: T) =>
  z.object({ is: t.optional(), isNot: t.optional() }).strict();

export function formatWhereOne<T>(
  { alias, ns }: Namespace.Result,
  localKey: SQL.Template,
  foreignTable: SQL.Template,
  foreignColumn: SQL.Template,
  clause: WhereOneRelated<T>,
  formatWhere: (nsr: Namespace.Result, component: T) => SQL.Template
): SQL.Template {
  const andComponents: SQL.Template[] = [];
  const foreignKey = SQL`${alias}.${foreignColumn}`;
  function subselect(clause: T): SQL.Template {
    return SQL`(SELECT 1 FROM ${foreignTable} AS ${alias} WHERE ${localKey} = ${foreignKey} AND ${formatWhere(
      { alias, ns },
      clause
    )} LIMIT 1)`;
  }
  if (clause.is !== undefined) {
    andComponents.push(SQL`1 = ${subselect(clause.is)}`);
  }
  if (clause.isNot !== undefined) {
    andComponents.push(SQL`NULL IS ${subselect(clause.isNot)}`);
  }
  if (andComponents.length > 0) return SQL.join(andComponents, " AND ");
  return SQL`1 = 1`;
}

export type WhereManyRelated<T> = {
  /** There exists one or more related models which satisfy this constraint. */
  some?: T;
  /** There do not exist any related models which satisfy this constraint. */
  none?: T;
};
export const WhereManyRelated = <T extends z.ZodSchema<unknown>>(t: T) =>
  z.object({ some: t.optional(), none: t.optional() }).strict();

export function formatWhereMany<T>(
  { alias, ns }: Namespace.Result,
  localKey: SQL.Template,
  foreignTable: SQL.Template,
  foreignColumn: SQL.Template,
  clause: WhereManyRelated<T>,
  formatWhere: (nsr: Namespace.Result, component: T) => SQL.Template
): SQL.Template {
  const andComponents: SQL.Template[] = [];
  const foreignKey = SQL`${alias}.${foreignColumn}`;
  function subselect(clause: T): SQL.Template {
    return SQL`(SELECT 1 FROM ${foreignTable} AS ${alias} WHERE ${localKey} = ${foreignKey} AND ${formatWhere(
      { alias, ns },
      clause
    )} LIMIT 1)`;
  }
  if (clause.some !== undefined) {
    andComponents.push(SQL`1 = ${subselect(clause.some)}`);
  }
  if (clause.none !== undefined) {
    andComponents.push(SQL`NULL IS ${subselect(clause.none)}`);
  }
  if (andComponents.length > 0) return SQL.join(andComponents, " AND ");
  return SQL`1 = 1`;
}
