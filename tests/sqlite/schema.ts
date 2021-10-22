import path from "path";
import { s, Config } from "@rad/core";
import sqliteGenerator from "@rad/sqlite-generator";

const database = s.database({ tbl: s.table({ col: s.text() }) });

const config: Config = {
  database,
  generators: [
    sqliteGenerator({
      output: path.join(__dirname, "src/client.generated.ts"),
    }),
  ],
};

export default config;
