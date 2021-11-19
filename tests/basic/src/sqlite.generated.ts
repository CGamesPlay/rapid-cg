// This file is automatically generated by @rad/sqlite-generator.
// @generated 36da3a3c-42c7-4bb5-a74d-dc43937c0db6
import * as Runtime from "@rad/sqlite";
import { SQL, z } from "@rad/sqlite";

export const Doc = z.object({
  rowid: z.union([z.number(), z.bigint()]),
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  parentId: z.string().uuid().nullable(),
  content: z.string(),
  extra: z.unknown(),
});
export type Doc = z.infer<typeof Doc>;

export type WhereDoc = {
  rowid?: Runtime.WhereNumber;
  id?: Runtime.WhereUuid;
  createdAt?: Runtime.WhereDate;
  updatedAt?: Runtime.WhereDate;
  parentId?: Runtime.WhereUuid;
  content?: Runtime.WhereString;
  AND?: Runtime.MaybeArray<WhereDoc>;
  OR?: Runtime.MaybeArray<WhereDoc>;
  NOT?: Runtime.MaybeArray<WhereDoc>;
};
export const WhereDoc: z.ZodSchema<WhereDoc> = z.lazy(() =>
  z.object({
    rowid: Runtime.WhereNumber.optional(),
    id: Runtime.WhereUuid.optional(),
    createdAt: Runtime.WhereDate.optional(),
    updatedAt: Runtime.WhereDate.optional(),
    parentId: Runtime.WhereUuid.optional(),
    content: Runtime.WhereString.optional(),
    AND: Runtime.MaybeArray(WhereDoc).optional(),
    OR: Runtime.MaybeArray(WhereDoc).optional(),
    NOT: Runtime.MaybeArray(WhereDoc).optional(),
  })
);

export const OrderDocBy = z.object({
  rowid: Runtime.SortOrder.optional(),
  id: Runtime.SortOrder.optional(),
  createdAt: Runtime.SortOrder.optional(),
  updatedAt: Runtime.SortOrder.optional(),
  parentId: Runtime.SortOrder.optional(),
  content: Runtime.SortOrder.optional(),
});
export type OrderDocBy = z.infer<typeof OrderDocBy>;

export const FindFirstDocArgs = z.object({
  where: WhereDoc.optional(),
  orderBy: Runtime.MaybeArray(OrderDocBy).optional(),
  offset: z.number().optional(),
});
export type FindFirstDocArgs = z.infer<typeof FindFirstDocArgs>;

export const FindManyDocArgs = z.object({
  where: WhereDoc.optional(),
  orderBy: Runtime.MaybeArray(OrderDocBy).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type FindManyDocArgs = z.infer<typeof FindManyDocArgs>;

export const CreateDocArgs = z.object({
  data: Doc.partial(),
});
export type CreateDocArgs = z.infer<typeof CreateDocArgs>;

export const CreateManyDocArgs = z.object({
  data: Doc.partial().array(),
});
export type CreateManyDocArgs = z.infer<typeof CreateManyDocArgs>;

export const UpdateManyDocArgs = z.object({
  data: Doc.partial(),
  where: WhereDoc.optional(),
  orderBy: Runtime.MaybeArray(OrderDocBy).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type UpdateManyDocArgs = z.infer<typeof UpdateManyDocArgs>;

export const DeleteManyDocArgs = z.object({
  where: WhereDoc.optional(),
  orderBy: Runtime.MaybeArray(OrderDocBy).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type DeleteManyDocArgs = z.infer<typeof DeleteManyDocArgs>;

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
  if (clause.parentId !== undefined) {
    components.push(Runtime.makeWhereUuid("parentId", clause.parentId));
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
    parentId: row.parentId as string | null,
    content: row.content as string,
    extra: JSON.parse(row.extra as string),
  };
}

function serializeDoc(obj: Partial<Doc>): Record<string, SQL.RawValue> {
  const result: Record<string, SQL.RawValue> = {};
  for (const key in obj) {
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
      case "parentId":
        result[key] = obj[key];
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

export class DocClient<
  ModelType = Doc
> extends Runtime.GenericClient<ModelType> {
  findFirst(args?: FindFirstDocArgs): ModelType | undefined {
    const columns = SQL.join(
      [
        SQL.id("rowid"),
        SQL.id("id"),
        SQL.id("createdAt"),
        SQL.id("updatedAt"),
        SQL.id("parentId"),
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
    return this.transform(parseDoc(row));
  }

  findMany(args?: FindManyDocArgs): ModelType[] {
    const columns = SQL.join(
      [
        SQL.id("rowid"),
        SQL.id("id"),
        SQL.id("createdAt"),
        SQL.id("updatedAt"),
        SQL.id("parentId"),
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
      .map((r) => this.transform(parseDoc(r)));
  }

  create(args: CreateDocArgs): ModelType {
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

export type Client<R> = {
  $db: Runtime.Database;
  docs: DocClient<R extends { docs: unknown } ? R["docs"] : Doc>;
};

export function createClient<R>(
  filename: string,
  options?: Runtime.Database.Options
): Client<R> {
  return Runtime.createClient(filename, options, {
    docs: DocClient,
  });
}
