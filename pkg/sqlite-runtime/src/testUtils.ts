import SQL from "./tag.js";

const { getMatchers } = require("expect/build/jestMatchersObject");

function parse(stmt: SQL.Template) {
  return { sql: stmt.sql, values: stmt.values };
}

expect.extend({
  toEqualSQL(received: SQL.Template, expected: SQL.Template) {
    return getMatchers().toEqual.call(this, parse(received), parse(expected));
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqualSQL(expected: SQL.Template): R;
    }
  }
}
