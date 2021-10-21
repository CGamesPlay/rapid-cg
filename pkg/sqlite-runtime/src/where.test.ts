import SQL from "./tag.js";
import { makeWhereString, makeWhereNumber } from "./where.js";

import "./testUtils.js";

const col = SQL.id("col");

describe("makeWhereScalar", () => {
  it("handles scalar operations", () => {
    expect(
      makeWhereString("col", {
        equals: "value",
        not: "other",
        gt: "a",
        lt: "z",
        gte: "ae",
        lte: "ze",
      })
    ).toEqualSQL(
      SQL`${col} = ${"value"} AND ${col} != ${"other"} AND ${col} > ${"a"} AND ${col} < ${"z"} AND ${col} >= ${"ae"} AND ${col} <= ${"ze"}`
    );
  });
  it("handles set operations", () => {
    expect(
      makeWhereString("col", { in: ["one", "two"], notIn: ["three", "four"] })
    ).toEqualSQL(
      SQL`${col} IN ( ${"one"}, ${"two"} ) AND ${col} NOT IN ( ${"three"}, ${"four"} )`
    );
  });
  it("handles scalar nulls", () => {
    expect(makeWhereString("col", { equals: null, not: null })).toEqualSQL(
      SQL`${col} IS NULL AND ${col} IS NOT NULL`
    );
  });
});

describe("makeWhereString", () => {
  it("handles simple equality", () => {
    expect(makeWhereString("col", "value")).toEqualSQL(
      SQL`${col} = ${"value"}`
    );
  });
  it("handler empty clauses", () => {
    expect(makeWhereString("col", {})).toEqualSQL(SQL`1 = 1`);
  });
  it("handles like", () => {
    expect(makeWhereString("col", { like: "%foo%" })).toEqualSQL(
      SQL`${col} LIKE ${"%foo%"}`
    );
  });
});

describe("makeWhereNumber", () => {
  it("handles simple equality", () => {
    expect(makeWhereNumber("col", 2)).toEqualSQL(SQL`${col} = ${2}`);
  });
  it("handler empty clauses", () => {
    expect(makeWhereNumber("col", {})).toEqualSQL(SQL`1 = 1`);
  });
});
