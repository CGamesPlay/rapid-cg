import _ from "lodash";
import pluralize from "pluralize";

import * as T from "./types.js";

class ColumnAnyBuilder<DefaultType = never> {
  result: Omit<T.Column, "name">;

  constructor(input: Omit<T.Column, "name">) {
    this.result = input;
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

class RelationBuilder {
  result: Omit<T.Relation, "name">;

  constructor(input: Omit<T.Relation, "name" | "type">) {
    this.result = Object.assign({ type: "relation" }, input as any);
  }

  build(name: string): T.Relation {
    return Object.assign({} as T.Relation, this.result, { name });
  }
}

class ModelBuilder {
  result: Partial<T.ModelSchema> = { columns: {}, relations: {} };

  build(name: string): T.ModelSchema {
    return Object.assign(
      { tableName: _.lowerFirst(pluralize(name)) },
      this.result,
      { name }
    ) as any;
  }

  protected withProperties(input: unknown): this {
    const ret = Object.create(Object.getPrototypeOf(this));
    ret.result = {};
    Object.assign(ret.result, this.result, input);
    return ret;
  }

  inTable(tableName: string): this {
    return this.withProperties({ tableName });
  }

  withTimestamps(): this {
    return this.withProperties({
      columns: {
        ...this.result.columns,
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

  relation(column: string, foreignModel: string, foreignColumn: string) {
    return new RelationBuilder({ column, foreignModel, foreignColumn });
  },

  model(
    columns: Record<string, ColumnAnyBuilder<never> | RelationBuilder>
  ): ModelBuilder {
    const model = new ModelBuilder();
    for (let name in columns) {
      const result = columns[name].build(name);
      if (result.type === "relation") {
        model.result.relations![name] = result;
      } else {
        model.result.columns![name] = result;
      }
    }
    return model;
  },

  database(models: Record<string, ModelBuilder>): T.DatabaseSchema {
    const result: any = { models: {} as any };
    for (let name in models) {
      result.models[name] = models[name].build(name);
    }
    return T.DatabaseSchema.parse(result);
  },
};

export default s;
