#!/usr/bin/env node
import { Command, CommanderError, InvalidArgumentError } from "commander";

import { loadConfig } from "./index.js";

function makeProgram() {
  return new Command()
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
}

const outerProgram = makeProgram()
  .allowUnknownOption()
  .action(async () => {
    const config = loadConfig(outerProgram.opts());
    const program = makeProgram();

    const generateCmd = program
      .command("generate")
      .argument("[what...]", "only run these generators")
      .description("run code generators")
      .action(async (what: string[]) => {
        if (what.length === 0) {
          what = config.generators.map((g) => g.name);
        }
        const results = await Promise.allSettled(
          what.map(async (name) => {
            const generator = config.generators.find((g) => g.name === name);
            if (!generator) {
              throw new InvalidArgumentError(`no generator named ${name}`);
            }
            await generator.generate?.(config);
          })
        );
        let errors: string[] = [];
        results.forEach((r) => {
          if (r.status === "rejected") {
            errors.push(r.reason.message);
          }
        });
        if (errors.length > 0) {
          throw new CommanderError(
            errors.length,
            "generate",
            errors.join("\n")
          );
        }
      });

    config.generators.forEach((generator) => {
      if (!generator.commands) return;
      let name = generator.name;
      if (name.endsWith("-generator")) name = name.substr(0, name.length - 10);
      if (name.startsWith("@rad/")) name = name.substr(5);
      const group = program
        .command(name)
        .description(`commands relating to ${generator.name}`);
      generator.commands(config).forEach((cmd) => group.addCommand(cmd));
    });

    await program.parseAsync(process.argv);
  });

outerProgram
  .parseAsync(process.argv)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
