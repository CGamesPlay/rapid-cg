import path from "path";
import { Config } from "@rapid-cg/schema";

import { register } from "ts-node";

type Options = {
  config: string;
  project?: string;
};

export function loadConfig(opts: Options): Config {
  register({ project: opts.project, moduleTypes: { [opts.config]: "cjs" } });
  return require(path.resolve(opts.config)).default;
}
