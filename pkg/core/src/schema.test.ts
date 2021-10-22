import { s, Database } from "./schema.js";

describe("Database", () => {
  it("creates a basic schema", () => {
    expect(() =>
      s.database({
        todos: s.table({
          id: s.uuid().primary(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          text: s.text(),
        }),
      })
    ).not.toThrow();
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
