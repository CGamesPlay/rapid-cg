import sqlTag, {
  Sql as sqlTemplate,
  join as sqlJoin,
  raw as sqlRaw,
  empty as sqlEmpty,
  Value as sqlValue,
  RawValue as sqlRawValue,
} from "sql-template-tag";

export declare namespace SQL {
  export type Template = sqlTemplate;
  export type Value =
    | string
    | number
    | bigint
    | boolean
    | object
    | null
    | undefined;
  export type RawValue = Value | Template;
}

export interface SQL {
  (
    strings: readonly string[],
    ...values: readonly SQL.RawValue[]
  ): SQL.Template;
  join(values: readonly SQL.RawValue[], separator?: string): SQL.Template;
  raw(value: string): SQL.Template;
  empty: SQL.Template;
  id(value: string): SQL.Template;
}

// Quotes the string as an identifier, suitable for use as a table or column
// name.
function sqlId(id: string): SQL.Template {
  return sqlRaw(`"${id.replace(/"/g, '""')}"`);
}

export const SQL: SQL = sqlTag as any;
SQL.join = sqlJoin;
SQL.raw = sqlRaw;
SQL.empty = sqlEmpty;
SQL.id = sqlId;

export default SQL;
export { sqlJoin as join, sqlRaw as raw, sqlEmpty as empty, sqlId as id };
