import prettier from "prettier";
import { s, Database, Table, Column } from "@rad/schema";

function lit(val: unknown): string {
  if (typeof val === "bigint") {
    return `${val}n`;
  } else if (val instanceof Date) {
    return `new Date(${JSON.stringify(val.toISOString())})`;
  } else {
    return JSON.stringify(val);
  }
}

function columnType(column: Column): string {
  const orNull = column.nullable ? " | null" : "";
  switch (column.type) {
    case "text":
      return "string" + orNull;
    case "integer":
      return "number | bigint" + orNull;
    case "uuid":
      return "string" + orNull;
    case "date":
      return "Date" + orNull;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnWhereType(column: Column): string {
  switch (column.type) {
    case "text":
      return "Runtime.WhereString";
    case "integer":
      return "Runtime.WhereNumber";
    case "uuid":
      return "Runtime.WhereUuid";
    case "date":
      return "Runtime.WhereDate";
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnFormatWhere(column: Column): string {
  const args = `(${lit(column.name)}, clause.${column.name})`;
  switch (column.type) {
    case "text":
      return `Runtime.makeWhereString${args}`;
    case "integer":
      return `Runtime.makeWhereNumber${args}`;
    case "uuid":
      return `Runtime.makeWhereUuid${args}`;
    case "date":
      return `Runtime.makeWhereDate${args}`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnParse(column: Column): string {
  switch (column.type) {
    case "text":
    case "integer":
    case "uuid":
      return `row.${column.name} as ${columnType(column)}`;
    case "date":
      return `new Date(row.${column.name} as string)`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function columnSerialize(column: Column): string {
  switch (column.type) {
    case "text":
    case "integer":
    case "uuid":
      return `obj[key]`;
    case "date":
      return `obj[key]?.toISOString()`;
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${(column as any).type}`);
  }
}

function fillCreateData(
  name: string,
  tableType: string,
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
  return `function ${name}(data: Partial<${tableType}>): Partial<${tableType}> {
    return ${expr};
}`;
}

function fillUpdateData(
  name: string,
  tableType: string,
  columns: Column[]
): string {
  const ops: string[] = [];
  columns.forEach((c) => {
    if (c.type === "date" && c.mode === "updatedAt") {
      ops.push(`${c.name}: new Date()`);
    }
  });
  const expr = ops.length === 0 ? `data` : `{ ${ops.join(", ")}, ...data }`;
  return `function ${name}(data: Partial<${tableType}>): Partial<${tableType}> {
    return ${expr};
}`;
}

type TableInfo = {
  name: string;
  clientType: string;
  source: string;
};

function generateTableClient(schema: Table): TableInfo {
  const tableType = schema.name;
  const whereType = `${schema.name}Where`;
  const clientType = `${schema.name}Client`;
  const findArgsType = `${schema.name}FindArgs`;
  const createArgsType = `${schema.name}CreateArgs`;
  const createManyArgsType = `${schema.name}CreateManyArgs`;
  const updateManyArgsType = `${schema.name}UpdateManyArgs`;
  const deleteManyArgsType = `${schema.name}DeleteManyArgs`;
  const formatWhereFunc = `${schema.name}FormatWhere`;
  const parseFunc = `${schema.name}Parse`;
  const serializeFunc = `${schema.name}Serialize`;
  const fillCreateDataFunc = `${schema.name}FillCreateData`;
  const fillUpdateDataFunc = `${schema.name}FillUpdateData`;
  const columns = Object.values(schema.columns);
  let rowid = columns.find(
    (c) => c.type === "integer" && c.primary === "autoincrement"
  );
  if (!rowid) {
    rowid = s.integer().primary().build("rowid");
    columns.unshift(rowid);
  }
  const source = `export type ${tableType} = {
  ${columns.map((c) => `${c.name}: ${columnType(c)};`).join("\n")}
};

export type ${whereType} = {
  ${columns.map((c) => `${c.name}?: ${columnWhereType(c)};`).join("\n")}
  AND?: ${whereType};
  OR?: ${whereType};
  NOT?: ${whereType};
};

export type ${findArgsType} = {
  where?: ${whereType};
};

export type ${createArgsType} = {
  data: Partial<${tableType}>;
};

export type ${createManyArgsType} = {
  data: Partial<${tableType}>[];
};

export type ${updateManyArgsType} = {
  data: Partial<${tableType}>;
  where?: ${whereType};
  limit?: number;
};

export type ${deleteManyArgsType} = {
  where?: ${whereType};
  limit?: number;
};

const ${formatWhereFunc} = Runtime.makeWhereChainable((clause: ${whereType}) => {
  const components: SQL.Template[] = [];
  ${columns
    .map((c) => {
      return `if (clause.${c.name} !== undefined) {
      components.push(${columnFormatWhere(c)});
    }`;
    })
    .join("\n")}
  return components;
});

function ${parseFunc}(row: Record<string, unknown>): ${tableType} {
  return {
  ${columns.map((c) => `${c.name}: ${columnParse(c)},`).join("\n")}
  };
}

function ${serializeFunc}(obj: Partial<${tableType}>): Record<string, SQL.RawValue> {
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

${fillCreateData(fillCreateDataFunc, tableType, columns)}

${fillUpdateData(fillUpdateDataFunc, tableType, columns)}

export class ${clientType} extends Runtime.GenericClient {
  findFirst(args?: ${findArgsType}): ${tableType} | undefined {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const where = ${formatWhereFunc}(args?.where);
    const row = this.$db.get(
      SQL\`SELECT \${columns} FROM \${SQL.id("${tableType}")} WHERE \${where} LIMIT 1\`
    );
    if (!row) return undefined;
    return ${parseFunc}(row);
  }

  findMany(args?: ${findArgsType}): ${tableType}[] {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const where = ${formatWhereFunc}(args?.where);
    return this.$db.all(
      SQL\`SELECT \${columns} FROM \${SQL.id("${tableType}")} WHERE \${where}\`
    ).map(${parseFunc});
  }

  create(args: ${createArgsType}): ${tableType} {
    const data = ${fillCreateDataFunc}(args.data);
    const result = this.$db.run(Runtime.makeInsert("${tableType}", [${serializeFunc}(data)]));
    return this.findFirst({ where: { ${
      rowid.name
    }: result.lastInsertRowid } })!;
  }

  createMany(args: ${createManyArgsType}): Runtime.Database.RunResult {
    const data = args.data.map(${fillCreateDataFunc}).map(${serializeFunc});
    return this.$db.run(Runtime.makeInsert("${tableType}", data));
  }

  updateMany(args: ${updateManyArgsType}): Runtime.Database.RunResult {
    const data = ${fillUpdateDataFunc}(args.data);
    const where = ${formatWhereFunc}(args.where);
    const limit =
      args.limit !== undefined ? SQL\` LIMIT \${args.limit}\` : SQL.empty;
    return this.$db.run(
      SQL\`\${Runtime.makeUpdate("${tableType}", ${serializeFunc}(data))} WHERE \${where}\${limit}\`
    );
  }

  deleteMany(args?: ${deleteManyArgsType}): Runtime.Database.RunResult {
    const where = ${formatWhereFunc}(args?.where);
    const limit =
      args?.limit !== undefined ? SQL\` LIMIT \${args.limit}\` : SQL.empty;
    return this.$db.run(
      SQL\`DELETE FROM \${SQL.id("${tableType}")} WHERE \${where}\${limit}\`
    );
  }
}`;
  return { name: schema.name, clientType, source };
}

export function generateClient(schema: Database): string {
  const tableInfo = Object.values(schema.tables).map(generateTableClient);
  const typeDecls = [
    `$db: Runtime.Database;`,
    ...tableInfo.map((t) => `${t.name}: ${t.clientType};`),
  ];
  const src = `
import * as Runtime from "@rad/sqlite";
import { SQL } from "@rad/sqlite";

${tableInfo.map((t) => t.source).join("\n\n")}

export type Client = {
  ${typeDecls.join("\n")}
};

export const createClient: Runtime.CreateClient<Client> =
  Runtime.makeCreateClient({
    ${tableInfo.map((t) => `${t.name}: ${t.clientType},`).join("\n")}
  });`;
  return prettier.format(src, { parser: "typescript" });
}
