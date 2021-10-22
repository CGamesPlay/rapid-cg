import { s, Database } from "@rad/core";

import { generateClient } from "./generator.js";

const simpleSchema = s.database({ tbl: s.table({ col: s.text() }) });

describe("generateClient", () => {
  test.each([["simpleSchema", simpleSchema]])(
    "generates %s",
    (name: string, schema: Database) => {
      const src = generateClient(schema);
      expect(src).toMatchSnapshot();
    }
  );
});
