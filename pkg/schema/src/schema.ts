import * as T from "./types.js";

function clone<T>(base: T, ...newProps: Array<any>): T {
  const ret = Object.create(Object.getPrototypeOf(base));
  Object.assign(ret, ...newProps);
  return ret;
}

class ColumnAnyBuilder<DefaultType = never> {
  result: Omit<T.Column, "name">;

  constructor(input: Omit<T.Column, "name">) {
    this.result = input;
    Object.assign(this, input);
  }

  build(name: string): T.Column {
    return Object.assign({} as T.Column, this.result, { name });
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

class TableBuilder {
  columns: Record<string, T.Column> = {};

  build(name: string): T.TableSchema {
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

export const s = {
  date(): ColumnDateBuilder {
    return new ColumnDateBuilder({ type: "date" });
  },

  integer(): ColumnIntegerBuilder {
    return new ColumnIntegerBuilder({ type: "integer" });
  },

  json(): ColumnAnyBuilder<unknown> {
    return new ColumnAnyBuilder({ type: "json" });
  },

  text(): ColumnAnyBuilder<string> {
    return new ColumnAnyBuilder({ type: "text" });
  },

  uuid(): ColumnUuidBuilder {
    return new ColumnUuidBuilder({ type: "uuid" });
  },

  table(columns: Record<string, ColumnAnyBuilder<never>>): TableBuilder {
    const result = new TableBuilder();
    for (let name in columns) {
      result.columns[name] = columns[name].build(name);
    }
    return result;
  },

  database(tables: Record<string, TableBuilder>): T.DatabaseSchema {
    const result: any = { tables: {} as any };
    for (let name in tables) {
      result.tables[name] = tables[name].build(name);
    }
    return T.DatabaseSchema.parse(result);
  },
};

export default s;
