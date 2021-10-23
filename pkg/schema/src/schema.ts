export type ColumnAny = {
  name: string;
  unique?: boolean;
  nullable?: boolean;
};
export type ColumnText = ColumnAny & {
  type: "text";
  primary?: boolean;
  default?: string;
};
export type ColumnInteger = ColumnAny & {
  type: "integer";
  primary?: boolean | "autoincrement";
  default?: number | bigint;
};
export type ColumnDate = ColumnAny & {
  type: "date";
  mode?: "createdAt" | "updatedAt";
  primary?: boolean;
  default?: Date;
};
export type ColumnUuid = ColumnAny & {
  type: "uuid";
  autogenerate?: boolean;
  primary?: boolean;
  default?: string;
};
export type Column = ColumnText | ColumnUuid | ColumnDate | ColumnInteger;

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

class ColumnAnyBuilder<DefaultType = never> {
  result: Omit<Column, "name">;

  constructor(input: Omit<Column, "name">) {
    this.result = input;
    Object.assign(this, input);
  }

  build(name: string): Column {
    return Object.assign({} as Column, this.result, { name });
  }

  protected withProperties(input: unknown): this {
    const ret = Object.create(Object.getPrototypeOf(this));
    ret.result = {};
    Object.assign(ret.result, this.result, input);
    return ret;
  }

  primary(primary = true): this {
    return this.withProperties({ primary });
  }

  unique(unique = true): this {
    return this.withProperties({ unique });
  }

  nullable(nullable = true): this {
    return this.withProperties({ nullable });
  }

  default(value: DefaultType): this {
    return this.withProperties({ default: value });
  }
}

class ColumnUuidBuilder extends ColumnAnyBuilder<string> {
  autogenerate(autogenerate = true): this {
    return this.withProperties({ autogenerate });
  }
}

class ColumnDateBuilder extends ColumnAnyBuilder<Date> {
  mode: undefined | "createdAt" | "updatedAt";

  createdAt(): this {
    return this.withProperties({ mode: "createdAt" });
  }

  updatedAt(): this {
    return this.withProperties({ mode: "updatedAt" });
  }
}

class ColumnIntegerBuilder extends ColumnAnyBuilder<number | bigint> {
  autoincrement(): this {
    return this.withProperties({ primary: "autoincrement" });
  }
}

function uuid(): ColumnUuidBuilder {
  return new ColumnUuidBuilder({ type: "uuid" });
}

function date(): ColumnDateBuilder {
  return new ColumnDateBuilder({ type: "date" });
}

function integer(): ColumnIntegerBuilder {
  return new ColumnIntegerBuilder({ type: "integer" });
}

function text(): ColumnAnyBuilder<string> {
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

function table(columns: Record<string, ColumnAnyBuilder<never>>): TableBuilder {
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
  integer,
  text,
  table,
  database,
};

export default s;
