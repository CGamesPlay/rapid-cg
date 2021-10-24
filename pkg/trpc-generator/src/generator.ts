import _ from "lodash";
import pluralize from "pluralize";
import prettier from "prettier";
import { s, DatabaseSchema, ModelSchema } from "@rad/schema";

type ModelInfo = {
  name: string;
  clientName: string;
  scaffoldName: string;
  source: string;
};

function generateModelServer(schema: ModelSchema): ModelInfo {
  const modelType = _.upperFirst(schema.name);
  const clientName = _.lowerFirst(pluralize(modelType));
  const scaffoldName = `scaffold${modelType}`;
  const whereType = `Where${modelType}`;
  const clientType = `${modelType}Client`;
  const orderByType = `Order${modelType}By`;
  const findFirstArgsType = `FindFirst${modelType}Args`;
  const findManyArgsType = `FindMany${modelType}Args`;
  const createArgsType = `Create${modelType}Args`;
  const createManyArgsType = `CreateMany${modelType}Args`;
  const updateManyArgsType = `UpdateMany${modelType}Args`;
  const deleteManyArgsType = `DeleteMany${modelType}Args`;
  // prettier-ignore
  const source = `export function ${scaffoldName}(router: Router<Context>) {
  return router
    .query("findFirst", {
      input: Types.${findFirstArgsType},
      async resolve({ ctx, input }) {
        return ctx.client.${clientName}.findFirst(input);
      },
    })
    .query("findMany", {
      input: Types.${findManyArgsType},
      async resolve({ ctx, input }) {
        return ctx.client.${clientName}.findMany(input);
      },
    })
    .mutation("create", {
      input: Types.${createArgsType},
      async resolve({ ctx, input }) {
        return ctx.client.${clientName}.create(input);
      },
    })
    .mutation("createMany", {
      input: Types.${createManyArgsType},
      async resolve({ ctx, input }) {
        return await ctx.client.${clientName}.createMany(input);
      },
    })
    .mutation("updateMany", {
      input: Types.${updateManyArgsType},
      async resolve({ ctx, input }) {
        return await ctx.client.${clientName}.updateMany(input);
      },
    })
    .mutation("deleteMany", {
      input: Types.${deleteManyArgsType},
      async resolve({ ctx, input }) {
        return await ctx.client.${clientName}.deleteMany(input);
      },
    })
}`;
  return { name: schema.name, clientName, scaffoldName, source };
}

export function generateServer(
  schema: DatabaseSchema,
  clientImport: string
): string {
  const modelInfo = Object.values(schema.models).map(generateModelServer);
  const src = `
import * as trpc from "@trpc/server";

import * as Types from "${clientImport}";

// This is necessary because @trpc/server does not export the Router type (it
// exports LegacyRouter as Router).
/* istanbul ignore next */
class Wrapper<T> {
  wrapped() {
    return trpc.router<T>();
  }
}
type Router<T> = ReturnType<Wrapper<T>["wrapped"]>;

type Context = { client: Types.Client };

${modelInfo.map((t) => t.source).join("\n\n")}

export function scaffoldDatabase(router: Router<Context>) {
  return router
  ${modelInfo
    .map((m) => `.merge("${m.clientName}.", ${m.scaffoldName}(trpc.router()))`)
    .join("\n")};
}`;
  return prettier.format(src, { parser: "typescript" });
}
