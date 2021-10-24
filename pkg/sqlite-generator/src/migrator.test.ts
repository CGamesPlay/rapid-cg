import { s } from "@rad/schema";

import { generateMigration } from "./migrator.js";

describe("generateMigration", () => {
  it("adds a table", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "CREATE TABLE \\"users\\" (
        \\"id\\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
      );"
    `);
  });

  it("handles table aliases", () => {
    const src = generateMigration({
      from: s.database({
        Tbl: s.model({ id: s.integer().autoincrement() }).inTable("tbl"),
      }),
      to: s.database({
        MyModel: s.model({ id: s.integer().autoincrement() }).inTable("tbl"),
      }),
    });
    expect(src).toEqual("");
  });

  it("supports all column types", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        User: s.model({
          text: s.text(),
          integer: s.integer(),
          date: s.date(),
          uuid: s.uuid(),
          json: s.json(),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "CREATE TABLE \\"users\\" (
        \\"text\\" TEXT NOT NULL,
        \\"integer\\" INTEGER NOT NULL,
        \\"date\\" TEXT NOT NULL,
        \\"uuid\\" TEXT NOT NULL,
        \\"json\\" TEXT NOT NULL
      );"
    `);
  });

  it("supports all column constraints", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        User: s.model({
          unique: s.integer().unique(),
          nullable: s.integer().nullable(),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "CREATE TABLE \\"users\\" (
        \\"unique\\" INTEGER UNIQUE NOT NULL,
        \\"nullable\\" INTEGER
      );"
    `);
  });

  it("drops a table", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({ col: s.text() }),
      }),
      to: s.database({}),
    });
    expect(src).toMatchInlineSnapshot(`"DROP TABLE \\"users\\";"`);
  });

  it("adds a column", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({ col: s.text() }),
      }),
      to: s.database({
        User: s.model({ col: s.text(), extra: s.text() }),
      }),
    });
    expect(src).toMatchInlineSnapshot(
      `"ALTER TABLE \\"users\\" ADD COLUMN \\"extra\\" TEXT NOT NULL;"`
    );
  });

  it("drops a column", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({ col: s.text(), extra: s.text() }),
      }),
      to: s.database({
        User: s.model({ col: s.text() }),
      }),
    });
    expect(src).toMatchInlineSnapshot(
      `"ALTER TABLE \\"users\\" DROP COLUMN \\"extra\\";"`
    );
  });

  it("changes a column", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({ col: s.text(), extra: s.text() }),
      }),
      to: s.database({
        User: s.model({ col: s.text(), extra: s.text().nullable() }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "BEGIN EXCLUSIVE TRANSACTION;
      CREATE TABLE \\"transferusers\\" (
        \\"col\\" TEXT NOT NULL,
        \\"extra\\" TEXT
      );
      INSERT INTO transferusers ( \\"col\\", \\"extra\\" )
        SELECT \\"col\\", \\"extra\\"
        FROM \\"users\\";
      DROP TABLE users;
      ALTER TABLE transferusers RENAME TO users;
      COMMIT TRANSACTION;"
    `);
  });
});
