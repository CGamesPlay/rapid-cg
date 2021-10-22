#!/usr/bin/env node
import { Command, CommanderError, InvalidArgumentError } from "commander";

import { loadConfig } from "./index.js";

const program = new Command();

program
  .description("A code generator to help create applications quickly.")
  .option(
    "-c, --config <path>",
    "path to schema configuration file",
    "schema.ts"
  )
  .option(
    "--project <path>",
    "path to typescript configuration file",
    "tsconfig.json"
  );

const generateCmd = program
  .command("generate [what...]")
  .description("run a code generator")
  .option("-a, --all", "run all generators")
  .action(async (what: string[]) => {
    const { all } = generateCmd.opts();
    if (what !== undefined && all) {
      throw new InvalidArgumentError("cannot use --all with a named generator");
    }
    const config = loadConfig(program.opts());
    if (what.length === 0) {
      if (all || config.generators.length === 1) {
        what = config.generators.map((g) => g.name);
      } else {
        throw new InvalidArgumentError("no generator to run specified");
      }
    }
    const results = await Promise.allSettled(
      what.map(async (name) => {
        const generator = config.generators.find((g) => g.name === name);
        if (!generator) {
          throw new InvalidArgumentError(`no generator named ${name}`);
        }
        await generator.generate(config);
      })
    );
    let errors: string[] = [];
    results.forEach((r) => {
      if (r.status === "rejected") {
        errors.push(r.reason.message);
      }
    });
    if (errors.length > 0) {
      throw new CommanderError(errors.length, "generate", errors.join("\nA"));
    }
  });

program
  .parseAsync(process.argv)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
