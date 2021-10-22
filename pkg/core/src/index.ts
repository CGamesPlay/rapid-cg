import { Database } from "./schema.js";

export * from "./schema.js";

export interface Generator {
  // Should correspond to the package name, e.g. "@rad/sqlite-generator"
  name: string;
  // Runs this generator.
  generate(config: Config): Promise<void>;
}

export type Config = {
  database: Database;
  generators: Generator[];
};
