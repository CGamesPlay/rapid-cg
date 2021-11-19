import { Database } from "./driver.js";
import SQL from "./tag.js";

export type ClientType<
  Clients extends Record<string, new ($db: Database) => unknown>
> = { $db: Database } & {
  [name in keyof Clients]: InstanceType<Clients[name]>;
};

export function createClient<
  Clients extends Record<string, new ($db: Database) => unknown>
>(filename: string, options: Database.Options | undefined, ctors: Clients) {
  const $db = new Database(filename, options);
  const client: any = { $db };
  for (let name in ctors) {
    client[name] = new ctors[name]($db);
  }
  return client as ClientType<Clients>;
}

export function makeInsert(
  table: string,
  values: Array<Record<string, SQL.RawValue>>
): SQL.Template {
  if (values.length === 0) throw new Error("no values");
  const columns = Object.keys(values[0]);
  const rowFragments = values.map((val) => {
    if (Object.keys(val).length !== columns.length) {
      throw new Error("columns must be identical in all values");
    }
    let parts = columns.map((col) => {
      if (!(col in val)) {
        throw new Error("columns must be identical in all values");
      }
      return val[col];
    });
    return SQL`( ${SQL.join(parts, ", ")} )`;
  });
  return SQL`INSERT INTO ${SQL.id(table)} ( ${SQL.join(
    columns.map((c) => SQL.id(c)),
    ", "
  )} ) VALUES ${SQL.join(rowFragments, ", ")}`;
}

export function makeUpdate(
  table: string,
  values: Record<string, SQL.RawValue>
): SQL.Template {
  const exprs: SQL.Template[] = [];
  for (let key in values) {
    exprs.push(SQL`${SQL.id(key)} = ${values[key]}`);
  }
  if (exprs.length === 0) throw new Error("no values");
  return SQL`UPDATE ${SQL.id(table)} SET ${SQL.join(exprs, ", ")}`;
}

export class GenericClient<ModelType> {
  constructor(protected $db: Database) {}

  /* istanbul ignore next */
  transform(input: unknown): ModelType {
    // @ts-expect-error this is a helper function to hide the type cast
    return input;
  }
}
