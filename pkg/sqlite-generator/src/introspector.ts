import _ from "lodash";
import pluralize from "pluralize";
import { s, DatabaseSchema } from "@rad/schema";
import { Database, SQL } from "@rad/sqlite";

function tokenizeWords(val: string): Array<string> {
  const ret: string[] = [];
  val = val.trimEnd();
  while (true) {
    val = val.trimStart();
    /* istanbul ignore next */
    if (val === "") break;
    if (val[0] === '"') {
      const wordEnd = val.slice(1).search(/"(?!")/) + 1;
      ret.push(val.substring(1, wordEnd).replace(/""/g, '"'));
      val = val.slice(wordEnd + 1);
    } else {
      const wordEnd = val.indexOf(" ");
      if (wordEnd === -1) {
        ret.push(val);
        break;
      }
      ret.push(val.substring(0, wordEnd));
      val = val.slice(wordEnd);
    }
  }
  return ret;
}

export function introspectDatabase(db: Database): DatabaseSchema {
  const tableInfo = db.all<{ name: string; sql: string }>(
    SQL`SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT IN ( 'sqlite_sequence', 'schema_migrations' )`
  );
  const models: Record<string, any> = {};
  tableInfo.forEach((t) => {
    const modelParams: Record<string, any> = {};
    const columnDefs: string[][] = [];
    const keyDefs: string[][] = [];
    const directives = t.sql
      .substring(t.sql.indexOf("(") + 1, t.sql.lastIndexOf(")"))
      .split(",")
      .map(tokenizeWords)
      .forEach((s) => {
        if (s[0].toUpperCase() === "FOREIGN" && s[1].toUpperCase() === "KEY") {
          keyDefs.push(s);
        } else {
          columnDefs.push(s);
        }
      });
    columnDefs.forEach((def) => {
      const name = def[0];
      const type = def[1];
      const opts = def.slice(2).join(" ");

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
      const m = /GENERATED ALWAYS AS \((.*)\)/.exec(opts);
      if (m !== null) {
        col = col.generatedAs(m[1].trim());
      }
      modelParams[name] = col;
    });
    keyDefs.forEach((def, i) => {
      if (
        def.length !== 10 ||
        def[2] !== "(" ||
        def[4] !== ")" ||
        def[5].toUpperCase() !== "REFERENCES" ||
        def[7] !== "(" ||
        def[9] !== ")"
      ) {
        /* istanbul ignore next */
        throw new Error(`unsupported foreign key: ${JSON.stringify(def)}`);
      }
      const name = _.upperFirst(pluralize.singular(def[6]));
      modelParams[`relation${i}`] = s.belongsTo(def[3], name, def[8]);
    });
    const name = _.upperFirst(pluralize.singular(t.name));
    models[name] = s.model(modelParams).inTable(t.name);
  });
  return s.database(models);
}
