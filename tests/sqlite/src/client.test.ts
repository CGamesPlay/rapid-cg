import { SQL } from "@rad/sqlite";

import { createClient, Client } from "./test_expected.js";

describe("generated client", () => {
  let client: Client;
  beforeAll(() => {
    client = createClient(":memory:");
    client.$db.run(SQL`CREATE TABLE tbl ( col TEXT )`);
    client.$db.run(SQL`INSERT INTO tbl VALUES ( 'first' )`);
  });

  beforeEach(() => {
    client.$db.run(SQL`BEGIN`);
  });

  afterEach(() => {
    client.$db.run(SQL`ROLLBACK`);
  });

  describe("findFirst", () => {
    it("returns results", () => {
      const obj = client.tbl.findFirst({ where: { col: "first" } });
      expect(obj).toEqual({ col: "first" });
    });
  });

  describe("findMany", () => {
    it("returns results", () => {
      const obj = client.tbl.findMany({ where: { col: "first" } });
      expect(obj).toEqual([{ col: "first" }]);
    });
  });

  describe("create", () => {
    it("adds the item", () => {
      const obj = client.tbl.create({ data: { col: "second" } });
      expect(obj).toEqual({ col: "second" });
      const all = client.tbl.findMany({});
      expect(all).toEqual([{ col: "first" }, { col: "second" }]);
    });
  });

  describe("createMany", () => {
    it("adds the items", () => {
      const obj = client.tbl.createMany({
        data: [{ col: "second" }, { col: "third" }],
      });
      expect(obj.changes).toEqual(2);
      const all = client.tbl.findMany({});
      expect(all).toEqual([
        { col: "first" },
        { col: "second" },
        { col: "third" },
      ]);
    });
  });

  describe("updateMany", () => {
    it("updates the items", () => {
      const obj = client.tbl.updateMany({
        data: { col: "1st" },
        where: { col: "first" },
      });
      expect(obj.changes).toEqual(1);
      const all = client.tbl.findMany({});
      expect(all).toEqual([{ col: "1st" }]);
    });

    it("respects limits", () => {
      let ret = client.tbl.updateMany({ data: { col: "1st" }, limit: 0 });
      expect(ret.changes).toEqual(0);
    });
  });

  describe("deleteMany", () => {
    it("deletes the items", () => {
      let ret = client.tbl.deleteMany({ where: { col: "not found" } });
      expect(ret.changes).toEqual(0);
      ret = client.tbl.deleteMany({ where: {} });
      expect(ret.changes).toEqual(1);
      const all = client.tbl.findMany({});
      expect(all).toEqual([]);
    });

    it("respects limits", () => {
      let ret = client.tbl.deleteMany({ limit: 0 });
      expect(ret.changes).toEqual(0);
    });
  });
});
