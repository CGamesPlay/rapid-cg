import { s } from "@rad/core";

import { generate } from "./generator.js";

export const basicSchema = s.database({ tbl: s.table({ col: s.text() }) });

console.log(generate(basicSchema));
