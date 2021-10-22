import SQL from "./tag";

describe("SQL", () => {
  it("works as expected", () => {
    const stmt = SQL`SELECT ${SQL.join(
      [SQL.raw("1"), "untrusted", 123n],
      ", "
    )}`;
    expect(stmt.text).toEqual("SELECT 1, $1, $2");
    expect(stmt.values).toEqual(["untrusted", 123n]);
  });
});
