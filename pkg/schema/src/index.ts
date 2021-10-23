import { Command } from "commander";

import { Database } from "./schema.js";

export * from "./schema.js";

export interface Generator {
  // Should correspond to the package name, e.g. "@rad/sqlite-generator"
  name: string;
  // Runs this generator.
  generate?(config: Config): Promise<void>;
  // Return all of the additional commands that this generator supports.
  commands?(config: Config): Command[];
}

export type Config = {
  database: Database;
  generators: Generator[];
};
