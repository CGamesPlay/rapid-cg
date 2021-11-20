import { s } from "@rad/schema";

import { generateMigration } from "./migrator.js";

describe("generateMigration", () => {
  it("creates a table", () => {
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
          boolean: s.boolean(),
          date: s.date(),
          integer: s.integer(),
          json: s.json(),
          text: s.text(),
          uuid: s.uuid(),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "CREATE TABLE \\"users\\" (
        \\"boolean\\" INTEGER NOT NULL,
        \\"date\\" TEXT NOT NULL,
        \\"integer\\" INTEGER NOT NULL,
        \\"json\\" TEXT NOT NULL,
        \\"text\\" TEXT NOT NULL,
        \\"uuid\\" TEXT NOT NULL
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

  it("creates with foreign keys", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
          parent: s.belongsTo("parentId", "User", "id"),
          children: s.hasMany("id", "User", "parentId"),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "CREATE TABLE \\"users\\" (
        \\"id\\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        \\"parentId\\" INTEGER,
        FOREIGN KEY ( \\"parentId\\" ) REFERENCES \\"users\\" ( \\"id\\" )
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

  it("alters a foreign key", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
        }),
      }),
      to: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
          parent: s.belongsTo("parentId", "User", "id"),
          children: s.hasMany("id", "User", "parentId"),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "BEGIN EXCLUSIVE TRANSACTION;
      CREATE TABLE \\"transferusers\\" (
        \\"id\\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        \\"parentId\\" INTEGER,
        FOREIGN KEY ( \\"parentId\\" ) REFERENCES \\"users\\" ( \\"id\\" )
      );
      INSERT INTO transferusers ( \\"id\\", \\"parentId\\" )
        SELECT \\"id\\", \\"parentId\\"
        FROM \\"users\\";
      DROP TABLE users;
      ALTER TABLE transferusers RENAME TO users;
      COMMIT TRANSACTION;"
    `);
  });

  it("drops a foreign key", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
          parent: s.belongsTo("parentId", "User", "id"),
          children: s.hasMany("id", "User", "parentId"),
        }),
      }),
      to: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`
      "BEGIN EXCLUSIVE TRANSACTION;
      CREATE TABLE \\"transferusers\\" (
        \\"id\\" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        \\"parentId\\" INTEGER
      );
      INSERT INTO transferusers ( \\"id\\", \\"parentId\\" )
        SELECT \\"id\\", \\"parentId\\"
        FROM \\"users\\";
      DROP TABLE users;
      ALTER TABLE transferusers RENAME TO users;
      COMMIT TRANSACTION;"
    `);
  });

  it("ignores a renamed relation", () => {
    const src = generateMigration({
      from: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
          relation0: s.belongsTo("parentId", "User", "id"),
        }),
      }),
      to: s.database({
        User: s.model({
          id: s.integer().autoincrement(),
          parentId: s.integer().nullable(),
          parent: s.belongsTo("parentId", "User", "id"),
          children: s.hasMany("parentId", "User", "id"),
        }),
      }),
    });
    expect(src).toMatchInlineSnapshot(`""`);
  });
});
