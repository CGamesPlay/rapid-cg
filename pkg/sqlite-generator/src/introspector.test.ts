import { s } from "@rad/schema";
import { Database, SQL } from "@rad/sqlite";

import { introspectDatabase } from "./introspector.js";
import { generateMigration } from "./migrator.js";

describe("introspectDatabase", () => {
  let db: Database;
  beforeAll(() => {
    db = new Database(":memory:");
    db.run(SQL`
      CREATE TABLE "basic" (
        intPrimaryKey INTEGER PRIMARY KEY NOT NULL
      );`);
    db.run(SQL`
      CREATE TABLE "uuid" (
        id TEXT PRIMARY KEY NOT NULL
      );`);
    db.run(SQL`
      CREATE TABLE "tbl" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "uuid" TEXT UNIQUE NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "n" INTEGER,
        "label" TEXT NOT NULL
      );`);
  });

  it("works", () => {
    const schema = introspectDatabase(db);
    const migration = generateMigration({
      from: schema,
      to: s.database({
        basic: s.table({ intPrimaryKey: s.integer().primary() }),
        uuid: s.table({ id: s.uuid().primary().autogenerate() }),
        tbl: s.table({
          id: s.integer().autoincrement(),
          uuid: s.uuid().unique().autogenerate(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          n: s.integer().nullable(),
          label: s.text(),
        }),
      }),
    });
    expect(migration).toEqual("");
  });
});
