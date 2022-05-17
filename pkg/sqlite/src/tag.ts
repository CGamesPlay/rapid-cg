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
  /**
   * Create an SQL template string. Example:
   *
   * ```typescript
   * const email = "user@example.com";
   * const user = $db.get(SQL`SELECT * FROM users WHERE email = ${email}`);
   * ```
   */
  (
    strings: readonly string[],
    ...values: readonly SQL.RawValue[]
  ): SQL.Template;

  /**
   * Merge multiple values with the provided separator. Example:
   *
   * ```typescript
   * const userIds = [1, 2, 3];
   * const users = $db.all(
   *   SQL`SELECT * FROM users WHERE id IN (${SQL.join(userIds, ", ")})`
   * );
   * ```
   */
  join(values: readonly SQL.RawValue[], separator?: string): SQL.Template;

  /**
   * Return an SQL fragment equal to this value with no escaping. This allows
   * you to inject arbitrary SQL into your queries and there are very few
   * reasons it should ever be used. Example:
   *
   * ```typescript
   * const arbitrarySqlString = "DELETE FROM tbl";
   * $db.run(SQL.raw(arbitrarySqlString));
   * ```
   */
  raw(value: string): SQL.Template;

  /**
   * An empty SQL fragment. Equivalent to ``` SQL`` ```.
   */
  empty: SQL.Template;

  /**
   * Return an SQL fragment that quotes the given value as an identifier,
   * suitable for use as a table or column name. Example:
   *
   * ```typescript
   * const tableName = "table names can have spaces in them";
   * const data = $db.all(SQL`SELECT * FROM ${SQL.id(tableName)}`);
   * ```
   */
  id(value: string): SQL.Template;
}

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
