import { Database } from "./driver.js";
import SQL from "./tag.js";

export type ClientType<
  Clients extends Record<string, new ($db: Database, $table: string) => unknown>
> = { $db: Database } & {
  [name in keyof Clients]: InstanceType<Clients[name]>;
};

export function makeCreateClient<
  Clients extends Record<
    string,
    new ($db: Database, $table: string) => unknown
  >,
  MainClient = ClientType<Clients>
>(ctors: Clients) {
  return (filename: string, options?: Database.Options) => {
    const $db = new Database(filename, options);
    const client: any = { $db };
    for (let name in ctors) {
      client[name] = new ctors[name]($db, name);
    }
    return client as MainClient;
  };
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

export class GenericClient {
  constructor(protected $db: Database, protected $table: string) {}
}
