import { s, Database } from "@rad/core";

export const basicSchema = s.database({ tbl: s.table({ col: s.text() }) });

export const twitterSchema = s.database({
  users: s.table({
    id: s.uuid().primary(),
  }),
  posts: s.table({
    id: s.uuid().primary(),
  }),
});
