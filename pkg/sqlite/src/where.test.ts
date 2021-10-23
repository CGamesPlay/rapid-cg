import { v4 } from "uuid";

import SQL from "./tag.js";
import {
  WhereString,
  makeWhereString,
  makeWhereNumber,
  makeWhereDate,
  makeWhereUuid,
  makeWhereChainable,
} from "./where.js";

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
  it("handles simple null", () => {
    expect(makeWhereString("col", null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handles empty clauses", () => {
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
  it("handles simple null", () => {
    expect(makeWhereNumber("col", null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(makeWhereNumber("col", {})).toEqualSQL(SQL`1 = 1`);
  });
});

describe("makeWhereDate", () => {
  it("handles simple equality", () => {
    const date = new Date();
    expect(makeWhereDate("col", date)).toEqualSQL(
      SQL`${col} = ${date.toISOString()}`
    );
  });
  it("handles simple null", () => {
    expect(makeWhereDate("col", null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(makeWhereDate("col", {})).toEqualSQL(SQL`1 = 1`);
  });
});

describe("makeWhereUuid", () => {
  it("handles simple equality", () => {
    const uuid = v4();
    expect(makeWhereUuid("col", uuid)).toEqualSQL(SQL`${col} = ${uuid}`);
  });
  it("handles simple null", () => {
    expect(makeWhereUuid("col", null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(makeWhereUuid("col", {})).toEqualSQL(SQL`1 = 1`);
  });
});

type WhereTbl = {
  col?: WhereString;
  AND?: WhereTbl | WhereTbl[];
  OR?: WhereTbl | WhereTbl[];
  NOT?: WhereTbl | WhereTbl[];
};

const makeWhereTbl = makeWhereChainable((component: WhereTbl) => {
  if ("col" in component) return [makeWhereString("col", component.col!)];
  return [];
});

describe("makeWhereChainable", () => {
  it("handles empty conditions", () => {
    expect(makeWhereTbl({})).toEqualSQL(SQL`1 = 1`);
    expect(makeWhereTbl(undefined)).toEqualSQL(SQL`1 = 1`);
  });

  it("handles simple conditions", () => {
    expect(makeWhereTbl({ col: "one" })).toEqualSQL(SQL`${col} = ${"one"}`);
  });

  it("handles chained ANDs", () => {
    expect(
      makeWhereTbl({ col: "one", AND: { col: { not: null } } })
    ).toEqualSQL(SQL`${col} = ${"one"} AND ${col} IS NOT NULL`);
  });

  it("handles lists of ANDs", () => {
    expect(
      makeWhereTbl({
        AND: [{ col: { not: null } }, { col: { equals: "one" } }],
      })
    ).toEqualSQL(SQL`${col} IS NOT NULL AND ${col} = ${"one"}`);
  });

  it("handles chained ORs", () => {
    // Note that this is counter-intuitive but correct. We combine all of the
    // top-level keys using AND, so chaining OR in this way doesn't make much
    // sense.
    expect(makeWhereTbl({ col: "one", OR: { col: "two" } })).toEqualSQL(
      SQL`${col} = ${"one"} AND ( ${col} = ${"two"} )`
    );
  });

  it("handles lists of ORs", () => {
    expect(
      makeWhereTbl({
        OR: [{ col: "one" }, { col: "two" }],
      })
    ).toEqualSQL(SQL`( ${col} = ${"one"} OR ${col} = ${"two"} )`);
  });

  it("handles chained NOTs", () => {
    expect(makeWhereTbl({ col: "one", NOT: { col: null } })).toEqualSQL(
      SQL`${col} = ${"one"} AND NOT ( ${col} IS NULL )`
    );
  });

  it("handles lists of ANDs", () => {
    expect(
      makeWhereTbl({
        NOT: [{ col: "one" }, { col: "two" }],
      })
    ).toEqualSQL(SQL`NOT ( ${col} = ${"one"} ) AND NOT ( ${col} = ${"two"} )`);
  });

  it("handles complex queries", () => {
    expect(
      makeWhereTbl({
        OR: [{ col: { gt: "a" } }, { col: null }],
        NOT: { col: "excluded" },
      })
    ).toEqualSQL(
      SQL`( ${col} > ${"a"} OR ${col} IS NULL ) AND NOT ( ${col} = ${"excluded"} )`
    );
  });
});
