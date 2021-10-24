import _ from "lodash";
import pluralize from "pluralize";
import { s, DatabaseSchema } from "@rad/schema";
import { Database, SQL } from "@rad/sqlite";

export function introspectDatabase(db: Database): DatabaseSchema {
  const tableInfo = db.all<{ name: string; sql: string }>(
    SQL`SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT IN ( 'sqlite_sequence', 'schema_migrations' )`
  );
  const models: Record<string, any> = {};
  tableInfo.forEach((t) => {
    const columns: Record<string, any> = {};
    const columnSql = t.sql
      .substring(t.sql.indexOf("(") + 1, t.sql.lastIndexOf(")"))
      .split(",")
      .map((s) => s.replace(/^\s+|\s+$/g, ""))
      .map((s) => {
        let name: string, nameEnd: number;
        if (s[0] === '"') {
          nameEnd = s.slice(1).search(/"([^"]|$)/) + 2;
          name = s.substring(1, nameEnd - 1).replace(/""/g, '"');
        } else {
          nameEnd = s.indexOf(" ");
          name = s.substring(0, nameEnd);
        }
        const typeEnd = s.indexOf(" ", nameEnd + 1);
        const type = s.substring(
          nameEnd + 1,
          typeEnd === -1 ? s.length : typeEnd
        );
        const opts = typeEnd === -1 ? "" : s.substring(typeEnd + 1);
        return [name, type, opts];
      })
      .forEach(([name, type, opts]) => {
        let col: any;
        if (type === "INTEGER") {
          col = s.integer();
          if (opts.indexOf("AUTOINCREMENT") !== -1) col = col.autoincrement();
          else if (opts.indexOf("PRIMARY KEY") !== -1) col = col.primary();
        } else if (type === "TEXT") {
          col = s.text();
          if (opts.indexOf("PRIMARY KEY") !== -1) col = col.primary();
        } else {
          /* istanbul ignore next */
          throw new Error(
            `unsupported column type on ${t.name}.${name}: ${type}`
          );
        }
        if (opts.indexOf("UNIQUE") !== -1) col = col.unique();
        if (opts.indexOf("NOT NULL") === -1) col = col.nullable();
        columns[name] = col;
      });
    const name = _.upperFirst(pluralize.singular(t.name));
    models[name] = s.model(columns).inTable(t.name);
  });
  return s.database(models);
}
