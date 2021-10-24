import _ from "lodash";
import pluralize from "pluralize";
import prettier from "prettier";
import { s, DatabaseSchema, ModelSchema, Column } from "@rad/schema";

function lit(val: unknown): string {
  if (typeof val === "bigint") {
    return `${val}n`;
  } else if (val instanceof Date) {
    return `new Date(${JSON.stringify(val.toISOString())})`;
  } else {
    return JSON.stringify(val);
  }
}

function sqlId(id: string): string {
  return `"${id.replace(/"/g, '""')}"`;
}

function columnType(column: Column): string {
  const orNull = column.nullable ? " | null" : "";
  switch (column.type) {
    case "date":
      return "Date" + orNull;
    case "integer":
      return "number | bigint" + orNull;
    case "json":
      return "unknown";
    case "text":
      return "string" + orNull;
    case "uuid":
      return "string" + orNull;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnWhereType(column: Column): string {
  switch (column.type) {
    case "date":
      return "Runtime.WhereDate";
    case "integer":
      return "Runtime.WhereNumber";
    case "text":
      return "Runtime.WhereString";
    case "uuid":
      return "Runtime.WhereUuid";
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnFormatWhere(column: Column): string {
  const args = `(${lit(column.name)}, clause.${column.name})`;
  switch (column.type) {
    case "date":
      return `Runtime.makeWhereDate${args}`;
    case "integer":
      return `Runtime.makeWhereNumber${args}`;
    case "text":
      return `Runtime.makeWhereString${args}`;
    case "uuid":
      return `Runtime.makeWhereUuid${args}`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnParse(column: Column): string {
  switch (column.type) {
    case "date":
      return `new Date(row.${column.name} as string)`;
    case "integer":
    case "text":
    case "uuid":
      return `row.${column.name} as ${columnType(column)}`;
    case "json":
      return `JSON.parse(row.${column.name} as string)`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnSerialize(column: Column): string {
  switch (column.type) {
    case "date":
      return `obj[key]?.toISOString()`;
    case "integer":
    case "text":
    case "uuid":
      return `obj[key]`;
    case "json":
      return `JSON.stringify(obj[key])`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function fillCreateData(
  name: string,
  modelType: string,
  columns: Column[]
): string {
  const ops: string[] = [];
  columns.forEach((c) => {
    if (
      c.type === "date" &&
      (c.mode === "createdAt" || c.mode === "updatedAt")
    ) {
      ops.push(`${c.name}: new Date()`);
    } else if (c.type === "uuid" && c.autogenerate) {
      ops.push(`${c.name}: Runtime.randomUuid()`);
    } else if (c.default !== undefined) {
      ops.push(`${c.name}: ${lit(c.default)}`);
    }
  });
  const expr = ops.length === 0 ? `data` : `{ ${ops.join(", ")}, ...data }`;
  return `function ${name}(data: Partial<${modelType}>): Partial<${modelType}> {
    return ${expr};
}`;
}

function fillUpdateData(
  name: string,
  modelType: string,
  columns: Column[]
): string {
  const ops: string[] = [];
  columns.forEach((c) => {
    if (c.type === "date" && c.mode === "updatedAt") {
      ops.push(`${c.name}: new Date()`);
    }
  });
  const expr = ops.length === 0 ? `data` : `{ ${ops.join(", ")}, ...data }`;
  return `function ${name}(data: Partial<${modelType}>): Partial<${modelType}> {
    return ${expr};
}`;
}

type ModelInfo = {
  name: string;
  clientType: string;
  clientName: string;
  source: string;
};

function generateModelClient(schema: ModelSchema): ModelInfo {
  const modelType = _.upperFirst(schema.name);
  const clientName = _.lowerFirst(pluralize(modelType));
  const whereType = `Where${modelType}`;
  const clientType = `${modelType}Client`;
  const orderByType = `${modelType}OrderBy`;
  const findFirstArgsType = `FindFirst${modelType}Args`;
  const findManyArgsType = `FindMany${modelType}Args`;
  const createArgsType = `Create${modelType}Args`;
  const createManyArgsType = `CreateMany${modelType}Args`;
  const updateManyArgsType = `UpdateMany${modelType}Args`;
  const deleteManyArgsType = `DeleteMany${modelType}Args`;
  const formatWhereFunc = `formatWhere${modelType}`;
  const parseFunc = `parse${modelType}`;
  const serializeFunc = `serialize${modelType}`;
  const fillCreateDataFunc = `fill${modelType}CreateData`;
  const fillUpdateDataFunc = `fill${modelType}UpdateData`;
  const columns = Object.values(schema.columns);
  let rowid = columns.find(
    (c) => c.type === "integer" && c.primary === "autoincrement"
  );
  if (!rowid) {
    rowid = s.integer().primary().build("rowid");
    columns.unshift(rowid);
  }
  // prettier-ignore
  const source = `export type ${modelType} = {
  ${columns.map((c) => `${c.name}: ${columnType(c)};`).join("\n")}
};

export type ${whereType} = {
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => `${c.name}?: ${columnWhereType(c)};`)
    .join("\n")}
  AND?: Runtime.MaybeArray<${whereType}>;
  OR?: Runtime.MaybeArray<${whereType}>;
  NOT?: Runtime.MaybeArray<${whereType}>;
};

export type ${orderByType} = {
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => `${c.name}?: Runtime.SortOrder;`)
    .join("\n")}
};

export type ${findFirstArgsType} = {
  where?: ${whereType};
  orderBy?: Runtime.MaybeArray<${orderByType}>;
  offset?: number;
};

export type ${findManyArgsType} = {
  where?: ${whereType};
  orderBy?: Runtime.MaybeArray<${orderByType}>;
  limit?: number;
  offset?: number;
};

export type ${createArgsType} = {
  data: Partial<${modelType}>;
};

export type ${createManyArgsType} = {
  data: Partial<${modelType}>[];
};

export type ${updateManyArgsType} = {
  data: Partial<${modelType}>;
  where?: ${whereType};
  orderBy?: Runtime.MaybeArray<${orderByType}>;
  limit?: number;
  offset?: number;
};

export type ${deleteManyArgsType} = {
  where?: ${whereType};
  orderBy?: Runtime.MaybeArray<${orderByType}>;
  limit?: number;
  offset?: number;
};

const ${formatWhereFunc} = Runtime.makeWhereChainable((clause: ${whereType}) => {
  const components: SQL.Template[] = [];
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => {
      return `if (clause.${c.name} !== undefined) {
      components.push(${columnFormatWhere(c)});
    }`;
    })
    .join("\n")}
  return components;
});

function ${parseFunc}(row: Record<string, unknown>): ${modelType} {
  return {
  ${columns.map((c) => `${c.name}: ${columnParse(c)},`).join("\n")}
  };
}

function ${serializeFunc}(obj: Partial<${modelType}>): Record<string, SQL.RawValue> {
  const result: Record<string, SQL.RawValue> = {};
  for (let key in obj) {
    switch (key) {
      ${columns
        .map(
          (c) =>
            `case ${lit(c.name)}: result[key] = ${columnSerialize(c)}; break;`
        )
        .join("\n")}
        /* istanbul ignore next */
      default: throw new Error(\`invalid key \${key}\`);
    }
  }
  return result;
}

${fillCreateData(fillCreateDataFunc, modelType, columns)}

${fillUpdateData(fillUpdateDataFunc, modelType, columns)}

export class ${clientType} extends Runtime.GenericClient {
  findFirst(args?: ${findFirstArgsType}): ${modelType} | undefined {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(args.where)}\`);
    if (args?.orderBy !== undefined) parts.push(Runtime.makeOrderBy(args.orderBy));
    parts.push(SQL\`LIMIT 1\`);
    if (args?.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    const row = this.$db.get(
      SQL\`SELECT \${columns} FROM ${sqlId(schema.tableName)}\${SQL.join(parts, " ")}\`
    );
    if (!row) return undefined;
    return ${parseFunc}(row);
  }

  findMany(args?: ${findManyArgsType}): ${modelType}[] {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(args.where)}\`);
    if (args?.orderBy !== undefined) parts.push(Runtime.makeOrderBy(args.orderBy));
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(SQL\`LIMIT \${args?.limit ?? -1}\`);
      if (args?.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    }
    return this.$db.all(
      SQL\`SELECT \${columns} FROM ${sqlId(schema.tableName)}\${SQL.join(parts, " ")}\`
    ).map(${parseFunc});
  }

  create(args: ${createArgsType}): ${modelType} {
    const data = ${fillCreateDataFunc}(args.data);
    const result = this.$db.run(Runtime.makeInsert(${lit(schema.tableName)}, [${serializeFunc}(data)]));
    return this.findFirst({ where: { ${
      rowid.name
    }: result.lastInsertRowid } })!;
  }

  createMany(args: ${createManyArgsType}): Runtime.Database.RunResult {
    const data = args.data.map(${fillCreateDataFunc}).map(${serializeFunc});
    return this.$db.run(Runtime.makeInsert(${lit(schema.tableName)}, data));
  }

  updateMany(args: ${updateManyArgsType}): Runtime.Database.RunResult {
    const data = ${fillUpdateDataFunc}(args.data);
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(args.where)}\`);
    if (args.limit !== undefined || args.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { ${rowid.name}: "asc" }));
      parts.push(SQL\`LIMIT \${args.limit ?? -1}\`);
      if (args.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    }
    return this.$db.run(
      SQL\`\${Runtime.makeUpdate(${lit(schema.tableName)}, ${serializeFunc}(data))}\${SQL.join(parts, " ")}\`
    );
  }

  deleteMany(args?: ${deleteManyArgsType}): Runtime.Database.RunResult {
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(args.where)}\`);
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { ${rowid.name}: "asc" }));
      parts.push(SQL\`LIMIT \${args.limit ?? -1}\`);
      if (args.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    }
    return this.$db.run(
      SQL\`DELETE FROM ${sqlId(schema.tableName)}\${SQL.join(parts, " ")}\`
    );
  }
}`;
  return { name: schema.name, clientName, clientType, source };
}

export function generateClient(schema: DatabaseSchema): string {
  const modelInfo = Object.values(schema.models).map(generateModelClient);
  const typeDecls = [
    `$db: Runtime.Database;`,
    ...modelInfo.map((m) => `${m.clientName}: ${m.clientType};`),
  ];
  const src = `
import * as Runtime from "@rad/sqlite";
import { SQL } from "@rad/sqlite";

${modelInfo.map((t) => t.source).join("\n\n")}

export type Client = {
  ${typeDecls.join("\n")}
};

export const createClient: Runtime.CreateClient<Client> =
  Runtime.makeCreateClient({
    ${modelInfo.map((m) => `${m.clientName}: ${m.clientType},`).join("\n")}
  });`;
  return prettier.format(src, { parser: "typescript" });
}
