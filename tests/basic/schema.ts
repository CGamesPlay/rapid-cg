import * as path from "path";
import { s, Config } from "@rad/schema";
import sqliteGenerator from "@rad/sqlite-generator";
import trpcGenerator from "@rad/trpc-generator";

const database = s.database({
  Doc: s
    .model({
      id: s.uuid().primary().autogenerate(),
      createdAt: s.date().createdAt(),
      updatedAt: s.date().updatedAt(),
      parentId: s.uuid().nullable(),
      content: s.text(),
      extra: s.json().default({}),
      parent: s.relation("parentId", "Doc", "id"),
    })
    .inTable("tbl"),
});

const config: Config = {
  database,
  generators: [
    sqliteGenerator({
      clientFilename: path.join(__dirname, "src/sqlite.generated.ts"),
      migrationsPath: path.join(__dirname, "db/migrations"),
    }),
    trpcGenerator({
      clientImport: "./sqlite.generated.js",
      serverFilename: path.join(__dirname, "src/trpc.generated.ts"),
    }),
  ],
};

export default config;
