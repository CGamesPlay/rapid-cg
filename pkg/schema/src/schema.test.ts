import { s } from "./schema.js";

describe("Database", () => {
  it("creates a basic schema", () => {
    expect(() =>
      s.database({
        todos: s.table({
          id: s.uuid().primary().autogenerate(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          text: s.text().default("text"),
          extra: s.text(),
        }),
      })
    ).not.toThrow();
  });

  it("validates identifiers", () => {
    expect(() =>
      s.database({
        "test table": s.table({
          "test column": s.text(),
        }),
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"table name cannot be used as an identifier \\",
          \\"path\\": [
            \\"tables\\",
            \\"test table\\",
            \\"name\\"
          ]
        },
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"column name cannot be used as an identifier \\",
          \\"path\\": [
            \\"tables\\",
            \\"test table\\",
            \\"columns\\",
            \\"test column\\",
            \\"name\\"
          ]
        }
      ]"
    `);
  });
});

describe("TableBuilder", () => {
  it("can add timestamps", () => {
    expect(() =>
      s
        .table({
          id: s.uuid().primary(),
        })
        .withTimestamps()
        .build("tbl")
    ).not.toThrow();
  });
});
