import { Namespace } from "./utils.js";
import SQL from "./tag.js";

describe("Namespace", () => {
  it("nests safely", () => {
    let { alias, ns } = Namespace.root("tbl");
    expect(alias).toEqual(SQL.id("tbl"));
    ({ alias, ns } = ns.referenceTable("parent"));
    expect(alias).toEqual(SQL.id("parent"));
    ({ alias, ns } = ns.referenceTable("parent"));
    expect(alias).toEqual(SQL.id("parent_parent"));
  });
});
