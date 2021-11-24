import { v4 } from "uuid";

import SQL from "./tag.js";
import {
  formatWhereBlob,
  WhereBoolean,
  formatWhereBoolean,
  WhereString,
  formatWhereString,
  formatWhereNumber,
  formatWhereDate,
  formatWhereUuid,
  makeWhereChainable,
  WhereOneRelated,
  formatWhereOne,
  WhereManyRelated,
  formatWhereMany,
} from "./where.js";
import { Namespace } from "./utils.js";

import "./testUtils.js";

const col = SQL`"tbl"."col"`;

describe("formatWhereScalar", () => {
  it("handles scalar operations", () => {
    expect(
      formatWhereString(col, {
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
      formatWhereString(col, {
        in: ["one", "two"],
        notIn: ["three", "four"],
      })
    ).toEqualSQL(
      SQL`${col} IN ( ${"one"}, ${"two"} ) AND ${col} NOT IN ( ${"three"}, ${"four"} )`
    );
  });
  it("handles scalar nulls", () => {
    expect(formatWhereString(col, { equals: null, not: null })).toEqualSQL(
      SQL`${col} IS NULL AND ${col} IS NOT NULL`
    );
  });
});

describe("formatWhereBlob", () => {
  it("handles simple equality", () => {
    expect(formatWhereBlob(col, Buffer.alloc(1, 255))).toEqualSQL(
      SQL`${col} = ${Buffer.alloc(1, 255)}`
    );
  });
  it("handles simple null", () => {
    expect(formatWhereBlob(col, null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(formatWhereBlob(col, {})).toEqualSQL(SQL`1 = 1`);
  });
});

describe("formatWhereBoolean", () => {
  const cases: Array<[WhereBoolean, SQL.Template]> = [
    [true, SQL`${col} != 0`],
    [false, SQL`${col} = 0`],
    [null, SQL`${col} IS NULL`],
    [{ not: true }, SQL`${col} = 0`],
    [{ not: false }, SQL`${col} != 0`],
    [{ not: null }, SQL`${col} IS NOT NULL`],
    [{}, SQL`1 = 1`],
  ];
  cases.forEach(([where, expected]) => {
    it(`handles ${JSON.stringify(where)}`, () => {
      expect(formatWhereBoolean(col, where)).toEqualSQL(expected);
    });
  });
});

describe("formatWhereString", () => {
  it("handles simple equality", () => {
    expect(formatWhereString(col, "value")).toEqualSQL(
      SQL`${col} = ${"value"}`
    );
  });
  it("handles simple null", () => {
    expect(formatWhereString(col, null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handles empty clauses", () => {
    expect(formatWhereString(col, {})).toEqualSQL(SQL`1 = 1`);
  });
  it("handles like", () => {
    expect(formatWhereString(col, { like: "%foo%" })).toEqualSQL(
      SQL`${col} LIKE ${"%foo%"}`
    );
  });
});

describe("formatWhereNumber", () => {
  it("handles simple equality", () => {
    expect(formatWhereNumber(col, 2)).toEqualSQL(SQL`${col} = ${2}`);
  });
  it("handles simple null", () => {
    expect(formatWhereNumber(col, null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(formatWhereNumber(col, {})).toEqualSQL(SQL`1 = 1`);
  });
});

describe("formatWhereDate", () => {
  it("handles simple equality", () => {
    const date = new Date();
    expect(formatWhereDate(col, date)).toEqualSQL(
      SQL`${col} = ${date.toISOString()}`
    );
  });
  it("handles simple null", () => {
    expect(formatWhereDate(col, null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(formatWhereDate(col, {})).toEqualSQL(SQL`1 = 1`);
  });
});

describe("formatWhereUuid", () => {
  it("handles simple equality", () => {
    const uuid = v4();
    expect(formatWhereUuid(col, uuid)).toEqualSQL(SQL`${col} = ${uuid}`);
  });
  it("handles simple null", () => {
    expect(formatWhereUuid(col, null)).toEqualSQL(SQL`${col} IS NULL`);
  });
  it("handler empty clauses", () => {
    expect(formatWhereUuid(col, {})).toEqualSQL(SQL`1 = 1`);
  });
});

type WhereTbl = {
  col?: WhereString;
  parent?: WhereOneRelated<WhereTbl>;
  children?: WhereManyRelated<WhereTbl>;
  AND?: WhereTbl | WhereTbl[];
  OR?: WhereTbl | WhereTbl[];
  NOT?: WhereTbl | WhereTbl[];
};

const formatWhereTbl = makeWhereChainable(
  ({ alias, ns }: Namespace.Result, where: WhereTbl) => {
    const components: SQL.Template[] = [];
    if (where.col !== undefined) {
      components.push(
        formatWhereString(SQL`${alias}.${SQL.id("col")}`, where.col)
      );
    }
    if (where.parent !== undefined) {
      components.push(
        formatWhereOne(
          ns.referenceTable("parent"),
          SQL`${alias}.${SQL.id("parentId")}`,
          SQL.id("tbl"),
          SQL.id("id"),
          where.parent,
          formatWhereTbl
        )
      );
    }
    if (where.children !== undefined) {
      components.push(
        formatWhereMany(
          ns.referenceTable("children"),
          SQL`${alias}.${SQL.id("id")}`,
          SQL.id("tbl"),
          SQL.id("parentId"),
          where.children,
          formatWhereTbl
        )
      );
    }
    return components;
  }
);

describe("makeWhereChainable", () => {
  it("handles empty conditions", () => {
    expect(formatWhereTbl(Namespace.root("tbl"), {})).toEqualSQL(SQL`1 = 1`);
    expect(formatWhereTbl(Namespace.root("tbl"), undefined)).toEqualSQL(
      SQL`1 = 1`
    );
  });

  it("handles simple conditions", () => {
    expect(formatWhereTbl(Namespace.root("tbl"), { col: "one" })).toEqualSQL(
      SQL`${col} = ${"one"}`
    );
  });

  it("handles chained ANDs", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        col: "one",
        AND: { col: { not: null } },
      })
    ).toEqualSQL(SQL`${col} = ${"one"} AND ${col} IS NOT NULL`);
  });

  it("handles lists of ANDs", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        AND: [{ col: { not: null } }, { col: { equals: "one" } }],
      })
    ).toEqualSQL(SQL`${col} IS NOT NULL AND ${col} = ${"one"}`);
  });

  it("handles chained ORs", () => {
    // Note that this is counter-intuitive but correct. We combine all of the
    // top-level keys using AND, so chaining OR in this way doesn't make much
    // sense.
    expect(
      formatWhereTbl(Namespace.root("tbl"), { col: "one", OR: { col: "two" } })
    ).toEqualSQL(SQL`${col} = ${"one"} AND ( ${col} = ${"two"} )`);
  });

  it("handles lists of ORs", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        OR: [{ col: "one" }, { col: "two" }],
      })
    ).toEqualSQL(SQL`( ${col} = ${"one"} OR ${col} = ${"two"} )`);
  });

  it("handles chained NOTs", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), { col: "one", NOT: { col: null } })
    ).toEqualSQL(SQL`${col} = ${"one"} AND NOT ( ${col} IS NULL )`);
  });

  it("handles lists of ANDs", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        NOT: [{ col: "one" }, { col: "two" }],
      })
    ).toEqualSQL(SQL`NOT ( ${col} = ${"one"} ) AND NOT ( ${col} = ${"two"} )`);
  });

  it("handles complex queries", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        OR: [{ col: { gt: "a" } }, { col: null }],
        NOT: { col: "excluded" },
      })
    ).toEqualSQL(
      SQL`( ${col} > ${"a"} OR ${col} IS NULL ) AND NOT ( ${col} = ${"excluded"} )`
    );
  });
});

describe("formatWhereOne", () => {
  it("handles empty clauses", () => {
    expect(formatWhereTbl(Namespace.root("tbl"), { parent: {} })).toEqualSQL(
      SQL`1 = 1`
    );
  });

  it("handles .is", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        parent: { is: { col: "one" } },
      })
    ).toEqualSQL(
      SQL`1 = (SELECT 1 FROM "tbl" AS "parent" WHERE "tbl"."parentId" = "parent"."id" AND "parent"."col" = ${"one"} LIMIT 1)`
    );
  });

  it("handles .isNot", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        parent: { isNot: { col: "one" } },
      })
    ).toEqualSQL(
      SQL`NULL IS (SELECT 1 FROM "tbl" AS "parent" WHERE "tbl"."parentId" = "parent"."id" AND "parent"."col" = ${"one"} LIMIT 1)`
    );
  });

  it("handles nested conditions", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        parent: { is: { parent: { is: { col: "one" } } } },
      })
    ).toEqualSQL(
      SQL`1 = (SELECT 1 FROM "tbl" AS "parent" WHERE "tbl"."parentId" = "parent"."id" AND 1 = (SELECT 1 FROM "tbl" AS "parent_parent" WHERE "parent"."parentId" = "parent_parent"."id" AND "parent_parent"."col" = ${"one"} LIMIT 1) LIMIT 1)`
    );
  });
});

describe("formatWhereMany", () => {
  it("handles empty clauses", () => {
    expect(formatWhereTbl(Namespace.root("tbl"), { children: {} })).toEqualSQL(
      SQL`1 = 1`
    );
  });

  it("handles .some", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        children: { some: { col: "one" } },
      })
    ).toEqualSQL(
      SQL`1 = (SELECT 1 FROM "tbl" AS "children" WHERE "tbl"."id" = "children"."parentId" AND "children"."col" = ${"one"} LIMIT 1)`
    );
  });

  it("handles .none", () => {
    expect(
      formatWhereTbl(Namespace.root("tbl"), {
        children: { none: { col: "one" } },
      })
    ).toEqualSQL(
      SQL`NULL IS (SELECT 1 FROM "tbl" AS "children" WHERE "tbl"."id" = "children"."parentId" AND "children"."col" = ${"one"} LIMIT 1)`
    );
  });
});
