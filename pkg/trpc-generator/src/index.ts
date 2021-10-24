import path from "path";
import * as fs from "fs";
import { Config, Generator } from "@rad/schema";

import { generateServer } from "./generator.js";

type Options = {
  clientImport: string;
  serverFilename: string;
};

export default function trpcGenerator(opts: Options): Generator {
  if (!path.isAbsolute(opts.serverFilename)) {
    throw new Error("serverFilename must be absolute");
  }
  return {
    name: "@rad/trpc-generator",
    async generate(config: Config) {
      const source = generateServer(config.database, opts.clientImport);
      await fs.promises.writeFile(opts.serverFilename, source);
    },
  };
}
