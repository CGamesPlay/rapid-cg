import { s } from "@rad/schema";

import { generateClient } from "./generator.js";

describe("generateClient", () => {
  it("generates a client", () => {
    const schema = s.database({
      tbl: s.model({
        text: s.text().default("a string"),
        boolean: s.boolean().default(false),
        nullableBoolean: s.boolean().nullable(),
        integer: s.integer().default(100),
        bigint: s.integer().default(18014398509481984n),
        date: s.date().default(new Date(2020, 0, 1)),
        createdAt: s.date().createdAt(),
        updatedAt: s.date().updatedAt(),
        uuidConst: s.uuid().default("d09cf49b-8419-496c-850c-9437a94338d3"),
        uuidAuto: s.uuid().autogenerate(),
        json: s.json().default({ impressive: true }),
      }),
      relation: s.model({
        id: s.uuid(),
        parentId: s.uuid().nullable(),
        parent: s.belongsTo("parentId", "relation", "id"),
        children: s.hasMany("id", "relation", "parentId"),
      }),
    });
    // If this method does not throw, it means prettier successfully parsed and
    // rewrote the generated code.
    expect(() => generateClient(schema)).not.toThrow();
  });
});
