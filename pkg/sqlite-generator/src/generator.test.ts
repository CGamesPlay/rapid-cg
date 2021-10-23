import { s, Database } from "@rad/schema";

import { generateClient } from "./generator.js";

const testCases = {
  simpleSchema: s.database({
    tblA: s.table({ colA: s.text() }),
    tblB: s.table({ colB: s.text() }),
  }),
  datatypesSchema: s.database({
    tbl: s.table({
      id: s.integer().autoincrement(),
      uuid: s.uuid().unique().autogenerate(),
      createdAt: s.date().createdAt(),
      updatedAt: s.date().updatedAt(),
      n: s.integer().nullable(),
      label: s.text(),
    }),
  }),
  defaultsSchema: s.database({
    tbl: s.table({
      text: s.text().default("a string"),
      integer: s.integer().default(100),
      bigint: s.integer().default(18014398509481984n),
      date: s.date().default(new Date(2020, 0, 1)),
      uuid: s.uuid().default("d09cf49b-8419-496c-850c-9437a94338d3"),
    }),
  }),
};

describe("generateClient", () => {
  test.each(Object.entries(testCases))(
    "generates %s",
    (name: string, schema: Database) => {
      const src = generateClient(schema);
      expect(src).toMatchSnapshot();
    }
  );
});
