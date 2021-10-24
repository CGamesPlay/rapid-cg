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
  const source = `export function ${scaffoldName}(router: Router, client: Types.Client) {
  return router
    .query("findFirst", {
      input: Types.${findFirstArgsType},
      async resolve({ input }) {
        return client.${clientName}.findFirst(input);
      },
    })
    .query("findMany", {
      input: Types.${findManyArgsType},
      async resolve({ input }) {
        return client.${clientName}.findMany(input);
      },
    })
    .mutation("create", {
      input: Types.${createArgsType},
      async resolve({ input }) {
        return client.${clientName}.create(input);
      },
    })
    .mutation("createMany", {
      input: Types.${createManyArgsType},
      async resolve({ input }) {
        await client.${clientName}.createMany(input);
      },
    })
    .mutation("updateMany", {
      input: Types.${updateManyArgsType},
      async resolve({ input }) {
        await client.${clientName}.updateMany(input);
      },
    })
    .mutation("deleteMany", {
      input: Types.${deleteManyArgsType},
      async resolve({ input }) {
        await client.${clientName}.deleteMany(input);
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

type Router = ReturnType<typeof trpc.router>;

${modelInfo.map((t) => t.source).join("\n\n")}

export function scaffoldDatabase(router: Router, client: Types.Client) {
  return router
  ${modelInfo
    .map(
      (m) =>
        `.merge("${m.clientName}.", ${m.scaffoldName}(trpc.router(), client))`
    )
    .join("\n")};
}`;
  return prettier.format(src, { parser: "typescript" });
}
