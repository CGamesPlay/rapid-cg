import * as Runtime from "@rad/sqlite";
import { SQL } from "@rad/sqlite";

export type tbl = {
  col: string;
};

export type tblWhere = {
  rowid?: Runtime.WhereNumber;
  col?: Runtime.WhereString;
  AND?: tblWhere;
  OR?: tblWhere;
  NOT?: tblWhere;
};

export type tblFindArgs = {
  where?: tblWhere;
};

export type tblCreateArgs = {
  data: Partial<tbl>;
};

export type tblCreateManyArgs = {
  data: Partial<tbl>[];
};

export type tblUpdateManyArgs = {
  data: Partial<tbl>;
  where?: tblWhere;
  limit?: number;
};

export type tblDeleteManyArgs = {
  where?: tblWhere;
  limit?: number;
};

const tblFormatWhere = Runtime.makeWhereChainable((clause: tblWhere) => {
  const components: SQL.Template[] = [];
  if (clause.rowid !== undefined) {
    components.push(Runtime.makeWhereNumber("rowid", clause.rowid));
  }
  if (clause.col !== undefined) {
    components.push(Runtime.makeWhereString("col", clause.col));
  }
  return components;
});

export class tblClient extends Runtime.GenericClient {
  findFirst(args?: tblFindArgs): tbl | undefined {
    const columns = SQL.join([SQL.id("col")], ", ");
    const where = tblFormatWhere(args?.where);
    return this.$db.get(
      SQL`SELECT ${columns} FROM ${SQL.id("tbl")} WHERE ${where} LIMIT 1`
    );
  }

  findMany(args?: tblFindArgs): tbl[] {
    const columns = SQL.join([SQL.id("col")], ", ");
    const where = tblFormatWhere(args?.where);
    return this.$db.all(
      SQL`SELECT ${columns} FROM ${SQL.id("tbl")} WHERE ${where}`
    );
  }

  create(args: tblCreateArgs): tbl {
    const result = this.$db.run(Runtime.makeInsert("tbl", [args.data]));
    return this.findFirst({ where: { rowid: result.lastInsertRowid } })!;
  }

  createMany(args: tblCreateManyArgs): Runtime.Database.RunResult {
    return this.$db.run(Runtime.makeInsert("tbl", args.data));
  }

  updateMany(args: tblUpdateManyArgs): Runtime.Database.RunResult {
    const where = tblFormatWhere(args.where);
    const limit =
      args.limit !== undefined ? SQL` LIMIT ${args.limit}` : SQL.empty;
    return this.$db.run(
      SQL`${Runtime.makeUpdate("tbl", args.data)} WHERE ${where}${limit}`
    );
  }

  deleteMany(args: tblDeleteManyArgs): Runtime.Database.RunResult {
    const where = tblFormatWhere(args.where);
    const limit =
      args.limit !== undefined ? SQL` LIMIT ${args.limit}` : SQL.empty;
    return this.$db.run(
      SQL`DELETE FROM ${SQL.id("tbl")} WHERE ${where}${limit}`
    );
  }
}

export const createClient = Runtime.makeCreateClient({
  tbl: tblClient,
});

export type Client = ReturnType<typeof createClient>;
