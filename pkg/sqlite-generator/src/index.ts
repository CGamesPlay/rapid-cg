import path from "path";
import mkdirp from "mkdirp";
import { Command, InvalidArgumentError } from "commander";
import {
  Config,
  Generator,
  generatedBanner,
  writeGeneratedFile,
} from "@rapid-cg/schema";
import { SQL, Database } from "@rapid-cg/sqlite";

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

function getDatabase(providedUrl: string | undefined) {
  if (providedUrl) return new Database(providedUrl);
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("sqlite:")) {
    return new Database(url.slice(7));
  }
  throw new InvalidArgumentError(
    "database not provided and DATABASE_URL not set"
  );
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
    name: "@rapid-cg/sqlite-generator",
    generate(config: Config) {
      const banner = generatedBanner("@rapid-cg/sqlite-generator");
      const source = generateClient(config.database);
      return writeGeneratedFile(opts.clientFilename, banner + "\n" + source);
    },
    commands(config: Config) {
      const automigrateCmd = new Command("automigrate")
        .description(
          "update the database to the current schema without using a migration script"
        )
        .option("-d, --database <path>", "path to database file")
        .action(() => {
          const db = getDatabase(automigrateCmd.opts().database);
          const from = introspectDatabase(db);
          const to = config.database;
          const source = generateMigration({ from, to });
          db.exec(source);
          console.log("database has been updated to the latest schema");
          console.log(
            "NOTE: you will need to revert the database file to an earlier version if you want to automatically generate a migration script using the 'migrate' command."
          );
        });

      const migrateCmd = new Command("migrate")
        .description(
          "generate a migration script based on the current state of the database"
        )
        .option("-d, --database <path>", "path to database file")
        .action(async () => {
          const db = getDatabase(migrateCmd.opts().database);
          const from = introspectDatabase(db);
          const to = config.database;
          const filename = path.join(opts.migrationsPath, getMigrationName());
          const migrateUp = generateMigration({ from, to });
          if (migrateUp === "") {
            console.log("schema is already up-to-date");
            return;
          }
          const migrateDown = generateMigration({ from: to, to: from });
          const banner = generatedBanner("@rapid-cg/sqlite-generator", "--");
          const source = `-- migrate:up\n${migrateUp}\n\n-- migrate:down\n${migrateDown}\n`;
          mkdirp.sync(opts.migrationsPath);
          await writeGeneratedFile(filename, banner + "\n" + source);
          console.log("created", path.relative(process.cwd(), filename));
        });
      return [automigrateCmd, migrateCmd];
    },
  };
}
