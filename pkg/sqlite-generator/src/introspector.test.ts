import { s } from "@rad/schema";
import { Database, SQL } from "@rad/sqlite";

import { introspectDatabase } from "./introspector.js";
import { generateMigration } from "./migrator.js";

describe("introspectDatabase", () => {
  it("works", () => {
    const db = new Database(":memory:");
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
        "label" TEXT NOT NULL,
        "labelLength" INTEGER NOT NULL GENERATED ALWAYS AS (LENGTH(label))
      );`);
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
            labelLength: s.integer().generatedAs("LENGTH(label)"),
          })
          .inTable("tbl"),
      })
    );
  });

  it("parses default values", () => {
    const db = new Database(":memory:");
    db.run(SQL`
      CREATE TABLE "values" (
        "blob" BLOB NOT NULL DEFAULT x'deadbeef',
        "integer" INTEGER NOT NULL DEFAULT 42,
        "text" TEXT NOT NULL DEFAULT 'it''s text'
      );`);
    const schema = introspectDatabase(db);
    expect(schema).toEqual(
      s.database({
        Value: s.model({
          blob: s.blob().default(Buffer.from("deadbeef", "hex")),
          integer: s.integer().default(42),
          text: s.text().default("it's text"),
        }),
      })
    );
  });

  it("understands foreign keys", () => {
    const db = new Database(":memory:");
    db.run(SQL`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "parentId" INTEGER NULL,
        foreign key ( "parentId" ) references "users" ( "id" )
      );`);
    const actual = introspectDatabase(db);
    const expected = s.database({
      User: s.model({
        id: s.integer().autoincrement(),
        parentId: s.integer().nullable(),
        relation0: s.belongsTo("parentId", "User", "id"),
      }),
    });
    try {
      expect(actual).toEqual(expected);
    } catch (e) {
      // Have to do this for https://github.com/facebook/jest/issues/10577
      console.log(actual.models.User);
      console.log(expected.models.User);
      throw new Error("actual is not equal to expected value");
    }
  });
});
