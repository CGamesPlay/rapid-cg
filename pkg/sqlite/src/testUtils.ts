import type SQL from "./tag.js";

// @ts-ignore - ts-jest won't pick up the .d.ts file
import matchers from "expect/build/matchers";

function parse(stmt: SQL.Template) {
  return { sql: stmt.sql, values: stmt.values };
}

expect.extend({
  toEqualSQL(received: SQL.Template, expected: SQL.Template) {
    return matchers.toEqual.call(this, parse(received), parse(expected));
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqualSQL(expected: SQL.Template): R;
    }
  }
}
