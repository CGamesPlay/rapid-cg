import path from "path";
import {
  Config,
  Generator,
  generatedBanner,
  writeGeneratedFile,
} from "@rapid-cg/schema";

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
    name: "@rapid-cg/trpc-generator",
    generate(config: Config) {
      const banner = generatedBanner("@rapid-cg/trpc-generator");
      const source = generateServer(config.database, opts.clientImport);
      return writeGeneratedFile(opts.serverFilename, banner + "\n" + source);
    },
  };
}
