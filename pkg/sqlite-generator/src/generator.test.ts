import { s, Database } from "@rad/core";

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
      n: s.integer().required(),
      label: s.text(),
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
