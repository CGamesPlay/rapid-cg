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

    for (let i = 0; i < 10; i++) {
      client.docs.create({
        data: {
          rowid: i + 1,
          createdAt: testStarted,
          updatedAt: testStarted,
          content: `doc ${i + 1}`,
        },
      });
    }
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
    it("returns a result", () => {
      const obj = client.docs.findFirst();
      expect(obj).toEqual({
        rowid: expect.any(Number),
        id: expect.any(String),
        createdAt: testStarted,
        updatedAt: testStarted,
        content: "doc 1",
        extra: {},
      });
      // Test a fully-specified where condition
      const foundAgain = client.docs.findFirst({ where: obj });
      expect(foundAgain).toEqual(obj);
    });
    it("returns undefined", () => {
      const obj = client.docs.findFirst({ where: { content: null } });
      expect(obj).toEqual(undefined);
    });
    it("supports orderBy", () => {
      const obj = client.docs.findFirst({ orderBy: { content: "desc" } });
      expect(obj).toMatchObject({
        content: "doc 9",
      });
    });
    it("supports offset", () => {
      const row = client.docs.findFirst({ offset: 2 });
      expect(row).toMatchObject({ rowid: 3 });
    });
  });

  describe("findMany", () => {
    it("returns results", () => {
      const rows = client.docs.findMany();
      expect(rows).toHaveLength(10);
      expect(rows[0]).toEqual({
        rowid: expect.any(Number),
        id: expect.any(String),
        createdAt: testStarted,
        updatedAt: testStarted,
        content: "doc 1",
        extra: {},
      });
    });
    it("supports orderBy", () => {
      const rows = client.docs.findMany({
        orderBy: { content: "desc" },
        limit: 2,
      });
      expect(rows).toMatchObject([{ content: "doc 9" }, { content: "doc 8" }]);
    });
    it("supports limit and offset", () => {
      const rows = client.docs.findMany({ limit: 2, offset: 2 });
      expect(rows).toMatchObject([{ rowid: 3 }, { rowid: 4 }]);
    });
  });

  describe("create", () => {
    it("adds the item", () => {
      const obj = client.docs.create({
        data: { content: "second", extra: { author: "me" } },
      });
      expect(obj).toEqual({
        rowid: expect.any(Number),
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
        data: [{ content: "add 1" }, { content: "add 2" }],
      });
      expect(obj.changes).toEqual(2);
      const all = client.docs.findMany({
        where: { content: { in: ["add 1", "add 2"] } },
      });
      expect(all).toMatchObject([{ content: "add 1" }, { content: "add 2" }]);
    });
  });

  describe("updateMany", () => {
    it("updates the items", () => {
      const obj = client.docs.updateMany({
        data: { content: "updated content", extra: { author: "me" } },
        where: { rowid: 1 },
      });
      expect(obj.changes).toEqual(1);
      const refreshed = client.docs.findFirst({ where: { rowid: 1 } })!;
      expect(refreshed.createdAt).toEqual(testStarted);
      expect(refreshed.updatedAt).not.toEqual(testStarted);
      expect(refreshed.extra).toEqual({ author: "me" });
    });
    it("supports limit and offset", () => {
      let ret = client.docs.updateMany({ data: { content: "1st" }, limit: 0 });
      expect(ret.changes).toEqual(0);
      ret = client.docs.updateMany({
        data: { content: "changed" },
        limit: 1,
        offset: 1,
      });
      expect(ret.changes).toEqual(1);
      const row = client.docs.findFirst({ where: { rowid: 2 } });
      expect(row).toMatchObject({ content: "changed" });
    });
  });

  describe("deleteMany", () => {
    it("deletes the items", () => {
      let ret = client.docs.deleteMany({ where: { rowid: -100 } });
      expect(ret.changes).toEqual(0);
      ret = client.docs.deleteMany({ where: {} });
      expect(ret.changes).toEqual(10);
      const results = client.docs.findMany({});
      expect(results).toHaveLength(0);
    });
    it("supports limit and offset", () => {
      let ret = client.docs.deleteMany({ limit: 0 });
      expect(ret.changes).toEqual(0);
      ret = client.docs.deleteMany({ limit: 1, offset: 1 });
      expect(ret.changes).toEqual(1);
      const row = client.docs.findFirst({ where: { rowid: 2 } });
      expect(row).toBeUndefined();
    });
  });
});
