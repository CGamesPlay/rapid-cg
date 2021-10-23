import * as path from "path";
import { s, Config } from "@rad/schema";
import sqliteGenerator from "@rad/sqlite-generator";

const database = s.database({
  docs: s.table({
    id: s.uuid().primary().autogenerate(),
    createdAt: s.date().createdAt(),
    updatedAt: s.date().updatedAt(),
    content: s.text(),
    extra: s.text().nullable(),
  }),
});

const config: Config = {
  database,
  generators: [
    sqliteGenerator({
      clientFilename: path.join(__dirname, "src/client.generated.ts"),
      migrationsPath: path.join(__dirname, "db/migrations"),
    }),
  ],
};

export default config;
