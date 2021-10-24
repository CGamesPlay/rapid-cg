import * as Runtime from "@rad/sqlite";
import { SQL } from "@rad/sqlite";

export type Doc = {
  rowid: number | bigint;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  content: string;
  extra: unknown;
};

export type WhereDoc = {
  rowid?: Runtime.WhereNumber;
  id?: Runtime.WhereUuid;
  createdAt?: Runtime.WhereDate;
  updatedAt?: Runtime.WhereDate;
  content?: Runtime.WhereString;
  AND?: Runtime.MaybeArray<WhereDoc>;
  OR?: Runtime.MaybeArray<WhereDoc>;
  NOT?: Runtime.MaybeArray<WhereDoc>;
};

export type DocOrderBy = {
  rowid?: Runtime.SortOrder;
  id?: Runtime.SortOrder;
  createdAt?: Runtime.SortOrder;
  updatedAt?: Runtime.SortOrder;
  content?: Runtime.SortOrder;
};

export type FindFirstDocArgs = {
  where?: WhereDoc;
  orderBy?: Runtime.MaybeArray<DocOrderBy>;
  offset?: number;
};

export type FindManyDocArgs = {
  where?: WhereDoc;
  orderBy?: Runtime.MaybeArray<DocOrderBy>;
  limit?: number;
  offset?: number;
};

export type CreateDocArgs = {
  data: Partial<Doc>;
};

export type CreateManyDocArgs = {
  data: Partial<Doc>[];
};

export type UpdateManyDocArgs = {
  data: Partial<Doc>;
  where?: WhereDoc;
  orderBy?: Runtime.MaybeArray<DocOrderBy>;
  limit?: number;
  offset?: number;
};

export type DeleteManyDocArgs = {
  where?: WhereDoc;
  orderBy?: Runtime.MaybeArray<DocOrderBy>;
  limit?: number;
  offset?: number;
};

const formatWhereDoc = Runtime.makeWhereChainable((clause: WhereDoc) => {
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

function parseDoc(row: Record<string, unknown>): Doc {
  return {
    rowid: row.rowid as number | bigint,
    id: row.id as string,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    content: row.content as string,
    extra: JSON.parse(row.extra as string),
  };
}

function serializeDoc(obj: Partial<Doc>): Record<string, SQL.RawValue> {
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

function fillDocCreateData(data: Partial<Doc>): Partial<Doc> {
  return {
    id: Runtime.randomUuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    extra: {},
    ...data,
  };
}

function fillDocUpdateData(data: Partial<Doc>): Partial<Doc> {
  return { updatedAt: new Date(), ...data };
}

export class DocClient extends Runtime.GenericClient {
  findFirst(args?: FindFirstDocArgs): Doc | undefined {
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
      parts.push(SQL`WHERE ${formatWhereDoc(args.where)}`);
    if (args?.orderBy !== undefined)
      parts.push(Runtime.makeOrderBy(args.orderBy));
    parts.push(SQL`LIMIT 1`);
    if (args?.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    const row = this.$db.get(
      SQL`SELECT ${columns} FROM "tbl"${SQL.join(parts, " ")}`
    );
    if (!row) return undefined;
    return parseDoc(row);
  }

  findMany(args?: FindManyDocArgs): Doc[] {
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
      parts.push(SQL`WHERE ${formatWhereDoc(args.where)}`);
    if (args?.orderBy !== undefined)
      parts.push(Runtime.makeOrderBy(args.orderBy));
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(SQL`LIMIT ${args?.limit ?? -1}`);
      if (args?.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db
      .all(SQL`SELECT ${columns} FROM "tbl"${SQL.join(parts, " ")}`)
      .map(parseDoc);
  }

  create(args: CreateDocArgs): Doc {
    const data = fillDocCreateData(args.data);
    const result = this.$db.run(
      Runtime.makeInsert("tbl", [serializeDoc(data)])
    );
    return this.findFirst({ where: { rowid: result.lastInsertRowid } })!;
  }

  createMany(args: CreateManyDocArgs): Runtime.Database.RunResult {
    const data = args.data.map(fillDocCreateData).map(serializeDoc);
    return this.$db.run(Runtime.makeInsert("tbl", data));
  }

  updateMany(args: UpdateManyDocArgs): Runtime.Database.RunResult {
    const data = fillDocUpdateData(args.data);
    const parts: SQL.Template[] = [SQL.empty];
    if (args.where !== undefined)
      parts.push(SQL`WHERE ${formatWhereDoc(args.where)}`);
    if (args.limit !== undefined || args.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { rowid: "asc" }));
      parts.push(SQL`LIMIT ${args.limit ?? -1}`);
      if (args.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db.run(
      SQL`${Runtime.makeUpdate("tbl", serializeDoc(data))}${SQL.join(
        parts,
        " "
      )}`
    );
  }

  deleteMany(args?: DeleteManyDocArgs): Runtime.Database.RunResult {
    const parts: SQL.Template[] = [SQL.empty];
    if (args?.where !== undefined)
      parts.push(SQL`WHERE ${formatWhereDoc(args.where)}`);
    if (args?.limit !== undefined || args?.offset !== undefined) {
      parts.push(Runtime.makeOrderBy(args.orderBy ?? { rowid: "asc" }));
      parts.push(SQL`LIMIT ${args.limit ?? -1}`);
      if (args.offset !== undefined) parts.push(SQL`OFFSET ${args.offset}`);
    }
    return this.$db.run(SQL`DELETE FROM "tbl"${SQL.join(parts, " ")}`);
  }
}

export type Client = {
  $db: Runtime.Database;
  docs: DocClient;
};

export const createClient: Runtime.CreateClient<Client> =
  Runtime.makeCreateClient({
    docs: DocClient,
  });
