import * as path from "path";
import { s, Config } from "@rad/core";
import sqliteGenerator from "@rad/sqlite-generator";

const database = s.database({
  docs: s.table({
    id: s.uuid().primary().autogenerate(),
    createdAt: s.date().createdAt(),
    updatedAt: s.date().updatedAt(),
    content: s.text(),
  }),
});

const config: Config = {
  database,
  generators: [
    sqliteGenerator({
      output: path.join(__dirname, "src/client.generated.ts"),
    }),
  ],
};

export default config;
