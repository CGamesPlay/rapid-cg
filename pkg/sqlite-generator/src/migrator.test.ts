import { s } from "@rad/schema";

import { generateMigration } from "./migrator.js";

describe("generateMigration", () => {
  it("adds a table", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        tbl: s.table({
          id: s.integer().autoincrement(),
        }),
      }),
    });
    expect(src).toMatchSnapshot();
  });

  it("supports all column types", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        tbl: s.table({
          text: s.text(),
          integer: s.integer(),
          date: s.date(),
          uuid: s.uuid(),
          json: s.json(),
        }),
      }),
    });
    expect(src).toMatchSnapshot();
  });

  it("drops a table", () => {
    const src = generateMigration({
      from: s.database({
        tbl: s.table({ col: s.text() }),
      }),
      to: s.database({}),
    });
    expect(src).toMatchSnapshot();
  });

  it("adds a column", () => {
    const src = generateMigration({
      from: s.database({
        tbl: s.table({ col: s.text() }),
      }),
      to: s.database({
        tbl: s.table({ col: s.text(), extra: s.text() }),
      }),
    });
    expect(src).toMatchSnapshot();
  });

  it("drops a column", () => {
    const src = generateMigration({
      from: s.database({
        tbl: s.table({ col: s.text(), extra: s.text() }),
      }),
      to: s.database({
        tbl: s.table({ col: s.text() }),
      }),
    });
    expect(src).toMatchSnapshot();
  });

  it("changes a column", () => {
    const src = generateMigration({
      from: s.database({
        tbl: s.table({ col: s.text(), extra: s.text() }),
      }),
      to: s.database({
        tbl: s.table({ col: s.text(), extra: s.text().nullable() }),
      }),
    });
    expect(src).toMatchSnapshot();
  });
});
