import * as fs from "fs";
import * as path from "path";
import { SQL, randomUuid } from "@rad/sqlite";

import { createClient, Client } from "./client.generated.js";

const testStarted = new Date(2000, 0);

function migrate(client: Client) {
  const dir = path.join(__dirname, "../db/migrations");
  const files = fs.readdirSync(dir);
  files.forEach((f) => {
    const sql = fs.readFileSync(path.join(dir, f), "utf-8");
    expect(sql).toMatch(/^-- migrate:up\n/m);
    expect(sql).toMatch("\n-- migrate:down\n");
    const endOfMigration = sql.indexOf("\n-- migrate:down\n");
    const upMigration = sql.substr(0, endOfMigration);
    client.$db.exec(upMigration);
  });
}

describe("generated client", () => {
  let client: Client;
  beforeAll(() => {
    client = createClient(":memory:");
    migrate(client);
    client.$db.run(
      SQL`INSERT INTO docs VALUES ( ${randomUuid()}, ${testStarted.toISOString()}, ${testStarted.toISOString()}, 'first doc', '{}' )`
    );
  });

  beforeEach(() => {
    client.$db.run(SQL`BEGIN`);
  });

  afterEach(() => {
    try {
      client.$db.run(SQL`ROLLBACK`);
    } catch (e) {
      // error - no transaction is in progress
    }
  });

  describe("findFirst", () => {
    it("returns results", () => {
      const obj = client.docs.findFirst({ where: { content: { not: null } } });
      expect(obj).toEqual({
        rowid: expect.any(Number),
        id: expect.any(String),
        createdAt: testStarted,
        updatedAt: testStarted,
        content: "first doc",
        extra: {},
      });
      const foundAgain = client.docs.findFirst({ where: obj });
      expect(foundAgain).toEqual(obj);
    });
    it("returns undefined", () => {
      const obj = client.docs.findFirst({ where: { content: null } });
      expect(obj).toEqual(undefined);
    });
  });

  describe("findMany", () => {
    it("returns results", () => {
      const obj = client.docs.findMany();
      expect(obj).toEqual([
        {
          rowid: expect.any(Number),
          id: expect.any(String),
          createdAt: testStarted,
          updatedAt: testStarted,
          content: "first doc",
          extra: {},
        },
      ]);
    });
  });

  describe("create", () => {
    it("adds the item", () => {
      const obj = client.docs.create({
        data: { rowid: 10, content: "second", extra: { author: "me" } },
      });
      expect(obj).toEqual({
        rowid: 10,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        content: "second",
        extra: { author: "me" },
      });
      const foundAgain = client.docs.findFirst({ where: { id: obj.id } });
      expect(foundAgain).toEqual(obj);
    });
  });

  describe("createMany", () => {
    it("adds the items", () => {
      const obj = client.docs.createMany({
        data: [{ content: "second" }, { content: "third" }],
      });
      expect(obj.changes).toEqual(2);
      const all = client.docs.findMany({});
      expect(all).toMatchObject([
        { content: "first doc", createdAt: expect.any(Date) },
        { content: "second" },
        { content: "third" },
      ]);
    });
  });

  describe("updateMany", () => {
    it("updates the items", () => {
      const obj = client.docs.updateMany({
        data: { content: "updated content", extra: { author: "me" } },
        where: { content: "first doc" },
      });
      expect(obj.changes).toEqual(1);
      const refreshed = client.docs.findFirst()!;
      expect(refreshed.createdAt).toEqual(testStarted);
      expect(refreshed.updatedAt).not.toEqual(testStarted);
      expect(refreshed.extra).toEqual({ author: "me" });
    });

    it("respects limits", () => {
      let ret = client.docs.updateMany({ data: { content: "1st" }, limit: 0 });
      expect(ret.changes).toEqual(0);
    });
  });

  describe("deleteMany", () => {
    it("deletes the items", () => {
      let ret = client.docs.deleteMany({ where: { rowid: -100 } });
      expect(ret.changes).toEqual(0);
      ret = client.docs.deleteMany({ where: {} });
      expect(ret.changes).toEqual(1);
      const all = client.docs.findMany({});
      expect(all).toEqual([]);
    });

    it("respects limits", () => {
      let ret = client.docs.deleteMany({ limit: 0 });
      expect(ret.changes).toEqual(0);
    });
  });
});
