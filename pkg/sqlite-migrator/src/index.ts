import path from "path";
import fs from "fs";
import { Config, Generator } from "@rad/core";

/*
import { generateClient } from "./generator.js";

type Options = {
  output: string;
};

export default function sqliteGenerator(opts: Options): Generator {
  if (!path.isAbsolute(opts.output)) {
    throw new Error("output path must be absolute");
  }
  return {
    name: "@rad/sqlite-generator",
    async generate(config: Config) {
      const source = generateClient(config.database);
      fs.writeFileSync(opts.output, source);
    },
  };
}
*/
