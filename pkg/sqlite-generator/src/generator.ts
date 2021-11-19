import _ from "lodash";
import pluralize from "pluralize";
import prettier from "prettier";
import { s, DatabaseSchema, ModelSchema, Column, Relation } from "@rad/schema";

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

function columnSchema(column: Column): string {
  const orNull = column.nullable ? ".nullable()" : "";
  switch (column.type) {
    case "date":
      return "z.date()" + orNull;
    case "integer":
      return "z.union([z.number(), z.bigint()])" + orNull;
    case "json":
      return "z.unknown()";
    case "text":
      return "z.string()" + orNull;
    case "uuid":
      return "z.string().uuid()" + orNull;
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

function columnWhereSchema(column: Column): string {
  return columnWhereType(column);
}

function relationWhereType(relation: Relation): string {
  const whereType = `Where${relation.foreignModel.name}`;
  switch (relation.relationType) {
    case "hasMany":
      return `Runtime.WhereManyRelated<${whereType}>`;
    case "belongsTo":
    case "hasOne":
      return `Runtime.WhereOneRelated<${whereType}>`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported relation type ${relation.relationType}`);
  }
}

function relationWhereSchema(relation: Relation): string {
  const whereType = `Where${relation.foreignModel.name}`;
  switch (relation.relationType) {
    case "hasMany":
      return `Runtime.WhereManyRelated(${whereType})`;
    case "belongsTo":
    case "hasOne":
      return `Runtime.WhereOneRelated(${whereType})`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported relation type ${relation.relationType}`);
  }
}

function columnFormatWhere(column: Column): string {
  const args = `(SQL\`$\{alias}.$\{SQL.id(${lit(column.name)})}\`, where.${
    column.name
  })`;
  switch (column.type) {
    case "date":
      return `Runtime.formatWhereDate${args}`;
    case "integer":
      return `Runtime.formatWhereNumber${args}`;
    case "text":
      return `Runtime.formatWhereString${args}`;
    case "uuid":
      return `Runtime.formatWhereUuid${args}`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function relationFormatWhere(relation: Relation): string {
  const formatWhereFunc = `formatWhere${relation.foreignModel.name}`;
  const args = `(
    ns.referenceTable(${lit(relation.name)}),
    SQL\`$\{alias}.$\{SQL.id(${lit(relation.column)})}\`,
    SQL.id(${lit(relation.foreignModel.tableName)}),
    SQL.id(${lit(relation.foreignColumn)}),
    where.${relation.name},
    ${formatWhereFunc}
  )`;
  switch (relation.relationType) {
    case "hasMany":
      return `Runtime.formatWhereMany${args}`;
    case "belongsTo":
    case "hasOne":
      return `Runtime.formatWhereOne${args}`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported relation type ${relation.relationType}`);
  }
}

function columnParse(column: Column): string {
  const orNull = column.nullable ? " | null" : "";
  switch (column.type) {
    case "date":
      return `new Date(row.${column.name} as string)`;
    case "integer":
      return `row.${column.name} as number | bigint${orNull}`;
    case "json":
      return `JSON.parse(row.${column.name} as string)`;
    case "text":
    case "uuid":
      return `row.${column.name} as string${orNull}`;
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
  modelType: string;
  clientType: string;
  clientName: string;
  source: string;
};

function generateModelClient(schema: ModelSchema): ModelInfo {
  const modelType = _.upperFirst(schema.name);
  const clientName = _.lowerFirst(pluralize(modelType));
  const whereType = `Where${modelType}`;
  const clientType = `${modelType}Client`;
  const orderByType = `Order${modelType}By`;
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
  const relations = Object.values(schema.relations);
  let rowid = columns.find(
    (c) => c.type === "integer" && c.primary === "autoincrement"
  );
  if (!rowid) {
    rowid = s.integer().primary().build("rowid");
    columns.unshift(rowid);
  }
  // prettier-ignore
  const source = `export const ${modelType} = z.object({
  ${columns.map((c) => `${c.name}: ${columnSchema(c)},`).join("\n")}
});
export type ${modelType} = z.infer<typeof ${modelType}>;

export type ${whereType} = {
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => `${c.name}?: ${columnWhereType(c)};`)
    .join("\n")}
  ${relations.map(r => `${r.name}?: ${relationWhereType(r)};`).join("\n")}
  AND?: Runtime.MaybeArray<${whereType}>;
  OR?: Runtime.MaybeArray<${whereType}>;
  NOT?: Runtime.MaybeArray<${whereType}>;
};
export const ${whereType}: z.ZodSchema<${whereType}> = z.lazy(() =>
  z.object({
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => `${c.name}: ${columnWhereSchema(c)}.optional(),`)
    .join("\n")}
  ${relations
    .map(r => `${r.name}?: ${relationWhereSchema(r)}.optional(),`)
    .join("\n")}
  AND: Runtime.MaybeArray(${whereType}).optional(),
  OR: Runtime.MaybeArray(${whereType}).optional(),
  NOT: Runtime.MaybeArray(${whereType}).optional(),
  }).strict()
);

export const ${orderByType} = z.object({
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => `${c.name}: Runtime.SortOrder.optional(),`)
    .join("\n")}
});
export type ${orderByType} = z.infer<typeof ${orderByType}>;

export const ${findFirstArgsType} = z.object({
  where: ${whereType}.optional(),
  orderBy: Runtime.MaybeArray(${orderByType}).optional(),
  offset: z.number().optional(),
});
export type ${findFirstArgsType} = z.infer<typeof ${findFirstArgsType}>;

export const ${findManyArgsType} = z.object({
  where: ${whereType}.optional(),
  orderBy: Runtime.MaybeArray(${orderByType}).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type ${findManyArgsType} = z.infer<typeof ${findManyArgsType}>;

export const ${createArgsType} = z.object({
  data: ${modelType}.partial(),
});
export type ${createArgsType} = z.infer<typeof ${createArgsType}>;

export const ${createManyArgsType} = z.object({
  data: ${modelType}.partial().array(),
});
export type ${createManyArgsType} = z.infer<typeof ${createManyArgsType}>;

export const ${updateManyArgsType} = z.object({
  data: ${modelType}.partial(),
  where: ${whereType}.optional(),
  orderBy: Runtime.MaybeArray(${orderByType}).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type ${updateManyArgsType} = z.infer<typeof ${updateManyArgsType}>;

export const ${deleteManyArgsType} = z.object({
  where: ${whereType}.optional(),
  orderBy: Runtime.MaybeArray(${orderByType}).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type ${deleteManyArgsType} = z.infer<typeof ${deleteManyArgsType}>;

const ${formatWhereFunc} = Runtime.makeWhereChainable(({ alias, ns }: Runtime.Namespace.Result, where: ${whereType}) => {
  const components: SQL.Template[] = [];
  ${columns
    .filter((c) => c.type !== "json")
    .map((c) => {
      return `if (where.${c.name} !== undefined) {
      components.push(${columnFormatWhere(c)});
    }`;
    })
    .join("\n")}
  ${relations.map(rel => {
    return `if (where.${rel.name} !== undefined) {
      components.push(${relationFormatWhere(rel)});
    }`;
  }).join("\n")}
  return components;
});

function ${parseFunc}(row: Record<string, unknown>): ${modelType} {
  return {
  ${columns.map((c) => `${c.name}: ${columnParse(c)},`).join("\n")}
  };
}

function ${serializeFunc}(obj: Partial<${modelType}>): Record<string, SQL.RawValue> {
  const result: Record<string, SQL.RawValue> = {};
  for (const key in obj) {
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

export class ${clientType}<ModelType = ${modelType}> extends Runtime.GenericClient<ModelType> {
  findFirst(args?: ${findFirstArgsType}): ModelType | undefined {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(Runtime.Namespace.root(${lit(schema.tableName)}), args.where)}\`);
    if (args?.orderBy !== undefined) parts.push(Runtime.makeOrderBy(args.orderBy));
    parts.push(SQL\`LIMIT 1\`);
    if (args?.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    const row = this.$db.get(
      SQL\`SELECT \${columns} FROM ${sqlId(schema.tableName)}\${SQL.join(parts, " ")}\`
    );
    if (!row) return undefined;
    return this.transform(${parseFunc}(row));
  }

  findMany(args?: ${findManyArgsType}): ModelType[] {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const parts: SQL.Template[] = [ SQL.empty ];
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(Runtime.Namespace.root(${lit(schema.tableName)}), args.where)}\`);
    if (args?.orderBy !== undefined) parts.push(Runtime.makeOrderBy(args.orderBy));
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(SQL\`LIMIT \${args?.limit ?? -1}\`);
      if (args?.offset !== undefined) parts.push(SQL\`OFFSET \${args.offset}\`);
    }
    return this.$db.all(
      SQL\`SELECT \${columns} FROM ${sqlId(schema.tableName)}\${SQL.join(parts, " ")}\`
    ).map((r) => this.transform(${parseFunc}(r)));
  }

  create(args: ${createArgsType}): ModelType {
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
    if (args.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(Runtime.Namespace.root(${lit(schema.tableName)}), args.where)}\`);
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
    if (args?.where !== undefined) parts.push(SQL\`WHERE \${${formatWhereFunc}(Runtime.Namespace.root(${lit(schema.tableName)}), args.where)}\`);
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
  return { name: schema.name, modelType, clientName, clientType, source };
}

export function generateClient(schema: DatabaseSchema): string {
  const modelInfo = Object.values(schema.models).map(generateModelClient);
  const typeDecls = [
    ...modelInfo.map((m) => `${m.clientName}: ${m.clientType};`),
  ];
  // prettier-ignore
  const src = `
import * as Runtime from "@rad/sqlite";
import { SQL, z } from "@rad/sqlite";

${modelInfo.map((t) => t.source).join("\n\n")}

export type Client<R> = {
  $db: Runtime.Database;
  ${modelInfo.map((m) =>
    `${m.clientName}: ${m.clientType}<R extends { "${m.clientName}": unknown } ? R["${m.clientName}"] : ${m.modelType}>;`
  ).join("\n")}
};

export function createClient<R>(
  filename: string,
  options?: Runtime.Database.Options
): Client<R> {
  return Runtime.createClient(filename, options, {
    ${modelInfo.map((m) => `${m.clientName}: ${m.clientType},`).join("\n")}
  });
}`;
  return prettier.format(src, { parser: "typescript" });
}
