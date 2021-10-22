import { expectType } from "ts-expect";

import SQL from "./tag.js";
import { Database } from "./driver.js";
import {
  ClientType,
  makeCreateClient,
  makeInsert,
  makeUpdate,
  GenericClient,
} from "./client.js";

import "./testUtils.js";

describe("makeCreateClient", () => {
  it("works", () => {
    const createClient = makeCreateClient({
      generic: GenericClient,
    });
    expectType<
      (
        filename: string,
        options?: Database.Options
      ) => ClientType<{ generic: typeof GenericClient }>
    >(createClient);
    const client = createClient(":memory:");
    expect(client).toMatchObject({
      $db: expect.any(Database),
      generic: expect.any(GenericClient),
    });
  });
});

describe("makeInsert", () => {
  it("creates expected SQL", () => {
    const actual = makeInsert("tbl", [
      { str: "value 1", num: 1 },
      { num: 2, str: SQL`NOW()` },
    ]);
    expect(actual).toEqualSQL(
      SQL`INSERT INTO "tbl" ( "str", "num" ) VALUES ( ${"value 1"}, ${1} ), ( NOW(), ${2} )`
    );
  });

  it("requires some data", () => {
    expect(() => makeInsert("tbl", [])).toThrow("no values");
  });

  it("verifies columns are all identical", () => {
    expect(() =>
      makeInsert("tbl", [{ one: "one" }, { one: "one", two: "two" }])
    ).toThrow("columns must be identical in all values");
    expect(() =>
      makeInsert("tbl", [{ one: "one", two: "two" }, { one: "one" }])
    ).toThrow("columns must be identical in all values");
    expect(() =>
      makeInsert("tbl", [
        { one: "one", two: undefined },
        { one: "one", two: "two" },
      ])
    ).not.toThrow();
    expect(() =>
      makeInsert("tbl", [
        { one: "one", two: "two" },
        { one: "one", three: "three" },
      ])
    ).toThrow("columns must be identical in all values");
  });
});

describe("makeUpdate", () => {
  it("creates expected SQL", () => {
    const actual = makeUpdate("tbl", {
      str: "value 1",
      num: 1,
      time: SQL`NOW()`,
    });
    const expected = SQL`UPDATE `;
    expect(actual).toEqualSQL(
      SQL`UPDATE "tbl" SET "str" = ${"value 1"}, "num" = ${1}, "time" = NOW()`
    );
  });

  it("requires some data", () => {
    expect(() => makeUpdate("tbl", {})).toThrow("no values");
  });
});
