import * as Runtime from "@rad/sqlite";
import { SQL } from "@rad/sqlite";

export type docs = {
  rowid: number | bigint;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  content: string;
  extra: unknown;
};

export type docsWhere = {
  rowid?: Runtime.WhereNumber;
  id?: Runtime.WhereUuid;
  createdAt?: Runtime.WhereDate;
  updatedAt?: Runtime.WhereDate;
  content?: Runtime.WhereString;
  AND?: docsWhere;
  OR?: docsWhere;
  NOT?: docsWhere;
};

export type docsOrderBy = {
  rowid?: Runtime.SortOrder;
  id?: Runtime.SortOrder;
  createdAt?: Runtime.SortOrder;
  updatedAt?: Runtime.SortOrder;
  content?: Runtime.SortOrder;
};

export type docsFindFirstArgs = {
  where?: docsWhere;
  orderBy?: Runtime.MaybeArray<docsOrderBy>;
  offset?: number;
};

export type docsFindManyArgs = {
  where?: docsWhere;
  orderBy?: Runtime.MaybeArray<docsOrderBy>;
  limit?: number;
  offset?: number;
};

export type docsCreateArgs = {
  data: Partial<docs>;
};

export type docsCreateManyArgs = {
  data: Partial<docs>[];
};

export type docsUpdateManyArgs = {
  data: Partial<docs>;
  where?: docsWhere;
  orderBy?: Runtime.MaybeArray<docsOrderBy>;
  limit?: number;
  offset?: number;
};

export type docsDeleteManyArgs = {
  where?: docsWhere;
  orderBy?: Runtime.MaybeArray<docsOrderBy>;
  limit?: number;
  offset?: number;
};

const docsFormatWhere = Runtime.makeWhereChainable((clause: docsWhere) => {
  const components: SQL.Template[] = [];
  if (clause.rowid !== undefined) {
    components.push(Runtime.makeWhereNumber("rowid", clause.rowid));
  }
  if (clause.id !== undefined) {
    components.push(Runtime.makeWhereUuid("id", clause.id));
  }
  if (clause.createdAt !== undefined) {
    components.push(Runtime.makeWhereDate("createdAt", clause.createdAt));
  }
  if (clause.updatedAt !== undefined) {
    components.push(Runtime.makeWhereDate("updatedAt", clause.updatedAt));
  }
  if (clause.content !== undefined) {
    components.push(Runtime.makeWhereString("content", clause.content));
  }
  return components;
});

function docsParse(row: Record<string, unknown>): docs {
  return {
    rowid: row.rowid as number | bigint,
    id: row.id as string,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    content: row.content as string,
    extra: JSON.parse(row.extra as string),
  };
}

function docsSerialize(obj: Partial<docs>): Record<string, SQL.RawValue> {
  const result: Record<string, SQL.RawValue> = {};
  for (let key in obj) {
    switch (key) {
      case "rowid":
        result[key] = obj[key];
        break;
      case "id":
        result[key] = obj[key];
        break;
      case "createdAt":
        result[key] = obj[key]?.toISOString();
        break;
      case "updatedAt":
        result[key] = obj[key]?.toISOString();
        break;
      case "content":
        result[key] = obj[key];
        break;
      case "extra":
        result[key] = JSON.stringify(obj[key]);
        break;
      /* istanbul ignore next */
      default:
        throw new Error(`invalid key ${key}`);
    }
  }
  return result;
}

function docsFillCreateData(data: Partial<docs>): Partial<docs> {
  return {
    id: Runtime.randomUuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    extra: {},
    ...data,
  };
}

function docsFillUpdateData(data: Partial<docs>): Partial<docs> {
  return { updatedAt: new Date(), ...data };
}

export class docsClient extends Runtime.GenericClient {
  findFirst(args?: docsFindFirstArgs): docs | undefined {
    const columns = SQL.join(
      [
        SQL.id("rowid"),
        SQL.id("id"),
        SQL.id("createdAt"),
        SQL.id("updatedAt"),
        SQL.id("content"),
        SQL.id("extra"),
      ],
      ", "
    );
    const parts: SQL.Template[] = [SQL.empty];
    if (args?.where !== undefined)
      parts.push(SQL`WHERE ${docsFormatWhere(args.where)}`);
    if (args?.orderBy !== undefined)
      parts.push(Runtime.makeOrderBy(args.orderBy));
    parts.push(SQL`LIMIT 1`);
    if (args?.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    const row = this.$db.get(
      SQL`SELECT ${columns} FROM ${SQL.id("docs")}${SQL.join(parts, " ")}`
    );
    if (!row) return undefined;
    return docsParse(row);
  }

  findMany(args?: docsFindManyArgs): docs[] {
    const columns = SQL.join(
      [
        SQL.id("rowid"),
        SQL.id("id"),
        SQL.id("createdAt"),
        SQL.id("updatedAt"),
        SQL.id("content"),
        SQL.id("extra"),
      ],
      ", "
    );
    const parts: SQL.Template[] = [SQL.empty];
    if (args?.where !== undefined)
      parts.push(SQL`WHERE ${docsFormatWhere(args.where)}`);
    if (args?.orderBy !== undefined)
      parts.push(Runtime.makeOrderBy(args.orderBy));
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(SQL`LIMIT ${args?.limit ?? -1}`);
      if (args?.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db
      .all(SQL`SELECT ${columns} FROM ${SQL.id("docs")}${SQL.join(parts, " ")}`)
      .map(docsParse);
  }

  create(args: docsCreateArgs): docs {
    const data = docsFillCreateData(args.data);
    const result = this.$db.run(
      Runtime.makeInsert("docs", [docsSerialize(data)])
    );
    return this.findFirst({ where: { rowid: result.lastInsertRowid } })!;
  }

  createMany(args: docsCreateManyArgs): Runtime.Database.RunResult {
    const data = args.data.map(docsFillCreateData).map(docsSerialize);
    return this.$db.run(Runtime.makeInsert("docs", data));
  }

  updateMany(args: docsUpdateManyArgs): Runtime.Database.RunResult {
    const data = docsFillUpdateData(args.data);
    const parts: SQL.Template[] = [SQL.empty];
    if (args.where !== undefined)
      parts.push(SQL`WHERE ${docsFormatWhere(args.where)}`);
    if (args.limit !== undefined || args.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { rowid: "asc" }));
      parts.push(SQL`LIMIT ${args.limit ?? -1}`);
      if (args.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db.run(
      SQL`${Runtime.makeUpdate("docs", docsSerialize(data))}${SQL.join(
        parts,
        " "
      )}`
    );
  }

  deleteMany(args?: docsDeleteManyArgs): Runtime.Database.RunResult {
    const parts: SQL.Template[] = [SQL.empty];
    if (args?.where !== undefined)
      parts.push(SQL`WHERE ${docsFormatWhere(args.where)}`);
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { rowid: "asc" }));
      parts.push(SQL`LIMIT ${args.limit ?? -1}`);
      if (args.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db.run(
      SQL`DELETE FROM ${SQL.id("docs")}${SQL.join(parts, " ")}`
    );
  }
}

export type Client = {
  $db: Runtime.Database;
  docs: docsClient;
};

export const createClient: Runtime.CreateClient<Client> =
  Runtime.makeCreateClient({
    docs: docsClient,
  });
