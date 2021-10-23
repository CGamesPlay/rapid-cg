import path from "path";
import fs from "fs";
import mkdirp from "mkdirp";
import { Command } from "commander";
import { Config, Generator } from "@rad/schema";
import { Database } from "@rad/sqlite";

import { introspectDatabase } from "./introspector.js";
import { generateMigration } from "./migrator.js";
import { generateClient } from "./generator.js";

function getMigrationName() {
  const now = new Date();
  return `${now
    .toISOString()
    .substring(0, 19)
    .replace(/[^0-9]/g, "")}_migration.sql`;
}

type Options = {
  clientFilename: string;
  migrationsPath: string;
};

export default function sqliteGenerator(opts: Options): Generator {
  if (!path.isAbsolute(opts.clientFilename)) {
    throw new Error("clientFilename must be absolute");
  }
  if (!path.isAbsolute(opts.migrationsPath)) {
    throw new Error("migrationsPath must be absolute");
  }
  return {
    name: "@rad/sqlite-generator",
    async generate(config: Config) {
      const source = generateClient(config.database);
      fs.writeFileSync(opts.clientFilename, source);
    },
    commands(config: Config) {
      let automigrateCmd = new Command("automigrate")
        .description(
          "update the database to the current schema without using a migration script"
        )
        .option("-d, --database <path>", "path to database file")
        .action(() => {
          const { database: databaseFilename } = automigrateCmd.opts();
          const db = new Database(databaseFilename);
          const from = introspectDatabase(db);
          const to = config.database;
          const source = generateMigration({ from, to });
          db.exec(source);
          console.log("database has been updated to the latest schema");
          console.log(
            "NOTE: you will need to revert the database file to an earlier version if you want to automatically generate a migration script using the 'migrate' command."
          );
        });
      let migrateCmd = new Command("migrate")
        .description(
          "generate a migration script based on the current state of the database"
        )
        .option("-d, --database <path>", "path to database file")
        .action(() => {
          const { database: databaseFilename } = migrateCmd.opts();
          const db = new Database(databaseFilename);
          const from = introspectDatabase(db);
          const to = config.database;
          const filename = path.join(opts.migrationsPath, getMigrationName());
          const migrateUp = generateMigration({ from, to });
          if (migrateUp === "") {
            console.log("schema is already up-to-date");
            return;
          }
          const migrateDown = generateMigration({ from: to, to: from });
          const source = `-- migrate:up\n${migrateUp}\n\n-- migrate:down\n${migrateDown}\n`;
          mkdirp.sync(opts.migrationsPath);
          fs.writeFileSync(filename, source);
          console.log("created", path.relative(process.cwd(), filename));
        });
      return [automigrateCmd, migrateCmd];
    },
  };
}
