import * as http from "http";
import * as trpc from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { createTRPCClient } from "@trpc/client";
import fetch from "node-fetch-commonjs";
import { expectType } from "ts-expect";
import * as Runtime from "@rad/sqlite";

import { client } from "./testUtils.js";
import { appRouter, AppRouter } from "./trpc.js";
import { Doc } from "./sqlite.js";

const globalAny = global as any;
globalAny.fetch = fetch;

const testStarted = new Date(2000, 0);

function createClient(port: number) {
  return createTRPCClient<AppRouter>({
    url: `http://localhost:${port}`,
  });
}

describe("createServer", () => {
  let server: http.Server;
  let trpcClient: ReturnType<typeof createClient>;

  beforeAll(() => {
    client.docs.create({
      data: {
        createdAt: testStarted,
        updatedAt: testStarted,
        content: "test doc",
      },
    });

    const { server: s, listen } = createHTTPServer({
      router: appRouter,
      createContext: () => ({ client }),
    });
    server = s;
    const port = listen(0).port!;
    trpcClient = createClient(port);
  });

  afterAll(() => {
    server.close();
  });

  describe("findFirst", () => {
    it("works", async () => {
      const doc = await trpcClient.query("docs.findFirst", {});
      expectType<Doc | undefined>(doc);
      expect(doc).toEqual({
        rowid: expect.any(Number),
        id: expect.any(String),
        createdAt: testStarted.toISOString(),
        updatedAt: testStarted.toISOString(),
        parentId: null,
        content: "test doc",
        extra: {},
      });
      // @ts-expect-error ensuring that doc is not any
      doc.invalid = 1;
    });
  });

  describe("findMany", () => {
    it("works", async () => {
      const docs = await trpcClient.query("docs.findMany", {});
      expectType<Doc[]>(docs);
      expect(docs).toHaveLength(1);
      // @ts-expect-error ensuring that docs is not any
      docs[0].invalid = 1;
    });
  });

  describe("create", () => {
    it("works", async () => {
      const doc = await trpcClient.mutation("docs.create", {
        data: { content: "docs over http" },
      });
      expectType<Doc>(doc);
      expect(doc).toMatchObject({ content: "docs over http" });
      // @ts-expect-error ensuring that doc is not any
      doc.invalid = 1;
    });
  });

  describe("createMany", () => {
    it("works", async () => {
      const ret = await trpcClient.mutation("docs.createMany", {
        data: [{ content: "docs over http" }],
      });
      expectType<Runtime.Database.RunResult>(ret);
      expect(ret).toEqual({ changes: 1, lastInsertRowid: expect.any(Number) });
      // @ts-expect-error ensuring that ret is not any
      ret.invalid = 1;
    });
  });

  describe("updateMany", () => {
    it("works", async () => {
      const ret = await trpcClient.mutation("docs.updateMany", {
        data: { content: "updated docs" },
        limit: 1,
      });
      expectType<Runtime.Database.RunResult>(ret);
      expect(ret).toMatchObject({ changes: 1 });
      // @ts-expect-error ensuring that ret is not any
      ret.invalid = 1;
    });
  });

  describe("deleteMany", () => {
    it("works", async () => {
      const ret = await trpcClient.mutation("docs.deleteMany", {
        limit: 1,
      });
      expectType<Runtime.Database.RunResult>(ret);
      expect(ret).toMatchObject({ changes: 1 });
      // @ts-expect-error ensuring that ret is not any
      ret.invalid = 1;
    });
  });
});
