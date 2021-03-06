import * as path from "path";
import { s, Config } from "@rapid-cg/schema";
import sqliteGenerator from "@rapid-cg/sqlite-generator";
import trpcGenerator from "@rapid-cg/trpc-generator";

const database = s.database({
  Doc: s
    .model({
      id: s.uuid().primary().autogenerate(),
      createdAt: s.date().createdAt(),
      updatedAt: s.date().updatedAt(),
      isActive: s.boolean().default(false),
      parentId: s.uuid().nullable(),
      content: s.text(),
      contentLength: s.integer().generatedAs("LENGTH(content)"),
      extra: s.json().default({}),
      //blob: s.blob().nullable(),
      parent: s.belongsTo("parentId", "Doc", "id"),
      children: s.hasMany("id", "Doc", "parentId"),
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
