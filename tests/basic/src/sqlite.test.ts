import { SQL, randomUuid } from "@rad/sqlite";

import { client } from "./testUtils.js";
import * as Types from "./sqlite.generated.js";

const testStarted = new Date(2000, 0);

describe("generated types", () => {
  it("Model", () => {
    let doc: Types.Doc = {
      rowid: 1,
      id: randomUuid(),
      createdAt: testStarted,
      updatedAt: testStarted,
      content: "string",
      extra: {},
    };
    Types.Doc.parse(doc);
    // @ts-expect-error invalild value for column
    doc.rowid = "string";
    expect(Types.Doc.safeParse(doc)).toMatchObject({ success: false });
  });

  it("Where", () => {
    let whereDoc: Types.WhereDoc;
    whereDoc = { content: "string" };
    whereDoc = { AND: [{ content: "string" }, { rowid: 7 }] };
    whereDoc = { AND: { content: "string" } };
    Types.WhereDoc.parse(whereDoc);
    // @ts-expect-error invalid value for column
    whereDoc = { content: 42 };
    expect(Types.WhereDoc.safeParse(whereDoc)).toMatchObject({
      success: false,
    });
  });

  it("OrderBy", () => {
    let orderBy: Types.OrderDocBy;
    orderBy = { updatedAt: "desc" };
    Types.OrderDocBy.parse(orderBy);
    // @ts-expect-error invalid sort order
    orderBy = { updatedAt: "unclear" };
    expect(Types.OrderDocBy.safeParse(orderBy)).toMatchObject({
      success: false,
    });
  });

  it("FindFirstArgs", () => {
    let findFirstArgs: Types.FindFirstDocArgs;
    findFirstArgs = { where: { content: { not: null } } };
    Types.FindFirstDocArgs.parse(findFirstArgs);
    // @ts-expect-error invalid value for column
    findFirstArgs = { where: { content: 42 } };
    expect(Types.FindFirstDocArgs.safeParse(findFirstArgs)).toMatchObject({
      success: false,
    });
  });

  it("FindManyArgs", () => {
    let findManyArgs: Types.FindManyDocArgs;
    findManyArgs = { where: { content: { not: null } } };
    Types.FindManyDocArgs.parse(findManyArgs);
    // @ts-expect-error invalid value for column
    findManyArgs = { where: { content: 42 } };
    expect(Types.FindManyDocArgs.safeParse(findManyArgs)).toMatchObject({
      success: false,
    });
  });

  it("CreateArgs", () => {
    let createArgs: Types.CreateDocArgs;
    createArgs = { data: { content: "wow" } };
    Types.CreateDocArgs.parse(createArgs);
    // @ts-expect-error array instead of object
    createArgs = { data: [{ content: "wow" }] };
    expect(Types.CreateDocArgs.safeParse(createArgs)).toMatchObject({
      success: false,
    });
  });

  it("CreateManyArgs", () => {
    let createManyArgs: Types.CreateManyDocArgs;
    createManyArgs = { data: [{ content: "wow" }] };
    Types.CreateManyDocArgs.parse(createManyArgs);
    // @ts-expect-error single object instead of array
    createManyArgs = { data: { content: "wow" } };
    expect(Types.CreateManyDocArgs.safeParse(createManyArgs)).toMatchObject({
      success: false,
    });
  });

  it("UpdateManyArgs", () => {
    let updateManyArgs: Types.UpdateManyDocArgs;
    updateManyArgs = { data: { content: "wow" } };
    Types.UpdateManyDocArgs.parse(updateManyArgs);
    // @ts-expect-error array instead of object
    updateManyArgs = { data: [{ content: "wow" }] };
    expect(Types.UpdateManyDocArgs.safeParse(updateManyArgs)).toMatchObject({
      success: false,
    });
  });

  it("DeleteManyArgs", () => {
    let deleteManyArgs: Types.DeleteManyDocArgs;
    deleteManyArgs = { where: { content: null } };
    Types.DeleteManyDocArgs.parse(deleteManyArgs);
    // @ts-expect-error invalid value for column
    deleteManyArgs = { where: { content: 42 } };
    expect(Types.DeleteManyDocArgs.safeParse(deleteManyArgs)).toMatchObject({
      success: false,
    });
  });
});

describe("generated client", () => {
  beforeAll(() => {
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
