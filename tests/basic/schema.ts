import * as path from "path";
import { s, Config } from "@rad/schema";
import sqliteGenerator from "@rad/sqlite-generator";

const database = s.database({
  Doc: s
    .model({
      id: s.uuid().primary().autogenerate(),
      createdAt: s.date().createdAt(),
      updatedAt: s.date().updatedAt(),
      content: s.text(),
      extra: s.json().default({}),
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
  ],
};

export default config;
