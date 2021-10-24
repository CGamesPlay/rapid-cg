import SQL from "./tag.js";
import { makeOrderBy } from "./order.js";

import "./testUtils.js";

describe("makeOrderBy", () => {
  it("handles single orderings", () => {
    expect(makeOrderBy({ rowid: "asc" })).toEqualSQL(SQL`ORDER BY "rowid"`);
    expect(makeOrderBy({ rowid: "desc" })).toEqualSQL(
      SQL`ORDER BY "rowid" DESC`
    );
  });
  it("handles multiple orderings", () => {
    expect(makeOrderBy([{ lastName: "asc" }, { firstName: "asc" }])).toEqualSQL(
      SQL`ORDER BY "lastName", "firstName"`
    );
  });
  it("handles no orderings", () => {
    expect(makeOrderBy([])).toEqualSQL(SQL``);
  });
  it("validates the input", () => {
    expect(() => makeOrderBy({ firstName: "asc", lastName: "asc" })).toThrow(
      "invalid orderBy clause"
    );
  });
});
