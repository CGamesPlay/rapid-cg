export type ColumnAny = { name: string; type: string; primary?: boolean };
export type ColumnDate = ColumnAny & {
  type: "date";
  mode?: "createdAt" | "updatedAt";
};
export type Column = ColumnAny | ColumnDate;

export type Table = {
  name: string;
  columns: Record<string, Column>;
};

export type Database = {
  tables: Record<string, Table>;
};

function clone<T>(base: T, ...newProps: Array<any>): T {
  const ret = Object.create(Object.getPrototypeOf(base));
  Object.assign(ret, ...newProps);
  return ret;
}

class ColumnAnyBuilder {
  result: Omit<Column, "name">;

  constructor(input: Partial<Column>) {
    this.result = input as Omit<Column, "name">;
    Object.assign(this, input);
  }

  build(name: string): Column {
    return Object.assign({}, this.result, { name });
  }

  protected withProperties(input: Partial<Column>): this {
    const ret = Object.create(Object.getPrototypeOf(this));
    ret.result = {};
    Object.assign(ret.result, this.result, input);
    return ret;
  }

  primary(primary = true): this {
    return this.withProperties({ primary });
  }
}

class ColumnDateBuilder extends ColumnAnyBuilder {
  mode: undefined | "createdAt" | "updatedAt";

  createdAt(): this {
    return this.withProperties({ mode: "createdAt" });
  }

  updatedAt(): this {
    return this.withProperties({ mode: "updatedAt" });
  }
}

function uuid(): ColumnAnyBuilder {
  return new ColumnAnyBuilder({ type: "uuid" });
}

function date(): ColumnDateBuilder {
  return new ColumnDateBuilder({ type: "date" });
}

function text(): ColumnAnyBuilder {
  return new ColumnAnyBuilder({ type: "text" });
}

class TableBuilder {
  columns: Record<string, Column> = {};

  build(name: string): Table {
    return Object.assign({}, this, { name }) as any;
  }

  withTimestamps(): this {
    return clone(this, {
      columns: {
        ...this.columns,
        createdAt: s.date().createdAt(),
        updatedAt: s.date().updatedAt(),
      },
    });
  }
}

function table(columns: Record<string, ColumnAnyBuilder>): TableBuilder {
  const result = new TableBuilder();
  for (let name in columns) {
    result.columns[name] = columns[name].build(name);
  }
  return result;
}

function database(tables: Record<string, TableBuilder>): Database {
  const result: Database = { tables: {} as any };
  for (let name in tables) {
    result.tables[name] = tables[name].build(name);
  }
  return result;
}

export const s = {
  uuid,
  date,
  text,
  table,
  database,
};

export default s;
