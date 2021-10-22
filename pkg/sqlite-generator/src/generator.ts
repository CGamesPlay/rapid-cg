import prettier from "prettier";
import { s, Database, Table, Column } from "@rad/core";

function lit(val: any): string {
  return JSON.stringify(val);
}

function property(obj: string, member: string): string {
  if (/^\w+$/.test(member)) return `${obj}.${member}`;
  return `${obj}[${lit(member)}]`;
}

function columnType(column: Column): string {
  switch (column.type) {
    case "text":
      return "string";
    case "integer":
      return "number | bigint";
    default:
      throw new Error(`Unsupported column type ${column.type}`);
  }
}

function columnWhereType(column: Column): string {
  switch (column.type) {
    case "text":
      return "Runtime.WhereString";
    case "integer":
      return "Runtime.WhereNumber";
    default:
      throw new Error(`Unsupported column type ${column.type}`);
  }
}

function columnFormatWhere(column: Column): string {
  switch (column.type) {
    case "text":
      return `Runtime.makeWhereString(${lit(column.name)}, ${property(
        "clause",
        column.name
      )})`;
    case "integer":
      return `Runtime.makeWhereNumber(${lit(column.name)}, ${property(
        "clause",
        column.name
      )})`;
    default:
      throw new Error(`Unsupported column type ${column.type}`);
  }
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
  const columns = Object.values(schema.columns);
  columns.unshift(s.integer().primary().build("rowid"));
  const source = `export type ${tableType} = {
  ${columns.map((c) => `${lit(c.name)}: ${columnType(c)};`).join("\n")}
};

export type ${whereType} = {
  ${columns.map((c) => `${lit(c.name)}?: ${columnWhereType(c)};`).join("\n")}
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

const tblFormatWhere = Runtime.makeWhereChainable((clause: ${whereType}) => {
  const components: SQL.Template[] = [];
  ${columns
    .map((c) => {
      return `if (${property("clause", c.name)} !== undefined) {
      components.push(${columnFormatWhere(c)});
    }`;
    })
    .join("\n")}
  return components;
});

export class tblClient extends Runtime.GenericClient {
  findFirst(args?: ${findArgsType}): ${tableType} | undefined {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const where = tblFormatWhere(args?.where);
    return this.$db.get(
      SQL\`SELECT \${columns} FROM \${SQL.id("${tableType}")} WHERE \${where} LIMIT 1\`
    );
  }

  findMany(args?: ${findArgsType}): ${tableType}[] {
    const columns = SQL.join([${columns
      .map((c) => `SQL.id(${lit(c.name)})`)
      .join(", ")}], ", ");
    const where = tblFormatWhere(args?.where);
    return this.$db.all(
      SQL\`SELECT \${columns} FROM \${SQL.id("${tableType}")} WHERE \${where}\`
    );
  }

  create(args: ${createArgsType}): ${tableType} {
    const result = this.$db.run(Runtime.makeInsert("${tableType}", [args.data]));
    return this.findFirst({ where: { rowid: result.lastInsertRowid } })!;
  }

  createMany(args: ${createManyArgsType}): Runtime.Database.RunResult {
    return this.$db.run(Runtime.makeInsert("${tableType}", args.data));
  }

  updateMany(args: ${updateManyArgsType}): Runtime.Database.RunResult {
    const where = tblFormatWhere(args.where);
    const limit =
      args.limit !== undefined ? SQL\` LIMIT \${args.limit}\` : SQL.empty;
    return this.$db.run(
      SQL\`\${Runtime.makeUpdate("${tableType}", args.data)} WHERE \${where}\${limit}\`
    );
  }

  deleteMany(args?: ${deleteManyArgsType}): Runtime.Database.RunResult {
    const where = tblFormatWhere(args?.where);
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
