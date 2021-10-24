import { s } from "./schema.js";

describe("Database", () => {
  it("creates a basic schema", () => {
    expect(
      s.database({
        Todo: s.model({
          id: s.uuid().primary().autogenerate(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          text: s.text().default("text"),
          extra: s.text(),
        }),
      })
    ).toEqual({
      models: {
        Todo: {
          columns: {
            id: expect.anything(),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
            text: expect.anything(),
            extra: expect.anything(),
          },
          name: "Todo",
          tableName: "todos",
        },
      },
    });
  });

  it("validates identifiers", () => {
    expect(() =>
      s.database({
        "test model": s.model({
          "test column": s.text(),
        }),
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"model name cannot be used as an identifier \\",
          \\"path\\": [
            \\"models\\",
            \\"test model\\",
            \\"name\\"
          ]
        },
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"column name cannot be used as an identifier \\",
          \\"path\\": [
            \\"models\\",
            \\"test model\\",
            \\"columns\\",
            \\"test column\\",
            \\"name\\"
          ]
        }
      ]"
    `);
  });
});

describe("ModelBuilder", () => {
  it("can add timestamps", () => {
    expect(() =>
      s.model({ id: s.uuid().primary() }).withTimestamps().build("tbl")
    ).not.toThrow();
  });

  it("can specify a table name", () => {
    expect(
      s.model({ id: s.uuid().primary() }).inTable("anotherTable").build("tbl")
    ).toEqual({
      columns: expect.anything(),
      name: "tbl",
      tableName: "anotherTable",
    });
  });
});
