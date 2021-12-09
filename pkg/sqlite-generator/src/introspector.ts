import _ from "lodash";
import pluralize from "pluralize";
import {
  s,
  DatabaseSchema,
  ColumnAnyBuilder,
  ColumnIntegerBuilder,
} from "@rapid-cg/schema";
import { Database, SQL } from "@rapid-cg/sqlite";
import invariant from "tiny-invariant";

function tokenizeWords(val: string): Array<string> {
  const ret: string[] = [];
  val = val.trimEnd();
  while (true) {
    val = val.trimStart();
    /* istanbul ignore next */
    if (val === "") break;
    if (val[0] === '"') {
      let match = /"(([^"]+|"")*)"/.exec(val);
      invariant(match);
      ret.push(match[1]);
      val = val.slice(match[0].length);
    } else if (val[0] === "'") {
      let match = /'([^']+|'')*'/.exec(val);
      invariant(match);
      ret.push(match[0]);
      val = val.slice(match[0].length);
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

function parseDefault(col: ColumnAnyBuilder<unknown>, val: string) {
  switch (col.result.type) {
    case "blob":
      invariant(val[0].toUpperCase() === "X");
      return col.default(
        Buffer.from(val.substring(2, val.length - 1).replace(/''/g, "'"), "hex")
      );
    case "integer":
      return col.default(parseInt(val, 10));
    case "text":
      return col.default(val.substring(1, val.length - 1).replace(/''/g, "'"));
    /* istanbul ignore next */
    default:
      throw new Error(`Unsupported column type ${col.result.type}`);
  }
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
      if (type === "BLOB") {
        col = s.blob();
      } else if (type === "INTEGER") {
        col = s.integer();
      } else if (type === "TEXT") {
        col = s.text();
      } else {
        /* istanbul ignore next */
        throw new Error(
          `unsupported column type on ${t.name}.${name}: ${type}`
        );
      }
      if (opts.indexOf("AUTOINCREMENT") !== -1) {
        col = (col as ColumnIntegerBuilder).autoincrement();
      } else if (opts.indexOf("PRIMARY KEY") !== -1) {
        col = col.primary();
      }
      if (opts.indexOf("UNIQUE") !== -1) col = col.unique();
      if (opts.indexOf("NOT NULL") === -1) col = col.nullable();
      if (opts.indexOf("DEFAULT") !== -1) {
        const idx = def.indexOf("DEFAULT");
        /* istanbul ignore next */
        if (def[idx + 1] === "(") {
          throw new Error(`unsupported default value ${t.name}.${name}`);
        }
        col = parseDefault(col, def[idx + 1]);
      }
      const m = /GENERATED ALWAYS AS \((.*)\)/.exec(opts);
      if (m !== null) {
        col = col.generatedAs(m[1].trim());
      }
      modelParams[name] = col;
    });
    keyDefs.forEach((def, i) => {
      /* istanbul ignore next */
      if (
        def.length !== 10 ||
        def[2] !== "(" ||
        def[4] !== ")" ||
        def[5].toUpperCase() !== "REFERENCES" ||
        def[7] !== "(" ||
        def[9] !== ")"
      ) {
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
