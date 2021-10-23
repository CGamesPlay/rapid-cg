import { s, Database } from "@rad/core";

import { generateMigration } from "./generator.js";

describe("generateMigration", () => {
  it("adds a table", () => {
    const src = generateMigration({
      from: s.database({}),
      to: s.database({
        tbl: s.table({
          id: s.integer().autoincrement(),
          uuid: s.uuid().unique().autogenerate(),
          createdAt: s.date().createdAt(),
          updatedAt: s.date().updatedAt(),
          n: s.integer().nullable(),
          label: s.text(),
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
