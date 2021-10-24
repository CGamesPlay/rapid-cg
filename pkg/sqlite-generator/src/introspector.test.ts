import { s } from "@rad/schema";
import { Database, SQL } from "@rad/sqlite";

import { introspectDatabase } from "./introspector.js";
import { generateMigration } from "./migrator.js";

describe("introspectDatabase", () => {
  let db: Database;
  beforeAll(() => {
    db = new Database(":memory:");
    db.run(SQL`
      CREATE TABLE "basics" (
        intPrimaryKey INTEGER PRIMARY KEY NOT NULL
      );`);
    db.run(SQL`
      CREATE TABLE "uuids" (
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
    expect(schema).toEqual(
      s.database({
        Basic: s.model({ intPrimaryKey: s.integer().primary() }),
        Uuid: s.model({ id: s.text().primary() }),
        Tbl: s
          .model({
            id: s.integer().autoincrement(),
            uuid: s.text().unique(),
            createdAt: s.text(),
            updatedAt: s.text(),
            n: s.integer().nullable(),
            label: s.text(),
          })
          .inTable("tbl"),
      })
    );
  });
});
