import { z } from "zod";

function validIdentifier(s: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) return false;
  return true;
}

export const ColumnAny = z.object({
  name: z.string().refine(validIdentifier, {
    message: "column name cannot be used as an identifier ",
  }),
  unique: z.boolean().optional(),
  nullable: z.boolean().optional(),
});
export type ColumnAny = z.infer<typeof ColumnAny>;

export const ColumnDate = ColumnAny.extend({
  type: z.literal("date"),
  mode: z.enum(["createdAt", "updatedAt"]).optional(),
  primary: z.boolean().optional(),
  default: z.instanceof(Date).optional(),
});
export type ColumnDate = z.infer<typeof ColumnDate>;

export const ColumnInteger = ColumnAny.extend({
  type: z.literal("integer"),
  primary: z.union([z.boolean(), z.literal("autoincrement")]).optional(),
  default: z.union([z.number(), z.bigint()]).optional(),
});
export type ColumnInteger = z.infer<typeof ColumnInteger>;

export const ColumnJson = ColumnAny.extend({
  type: z.literal("json"),
  primary: z.boolean().optional(),
  default: z.unknown().optional(),
});
export type ColumnJson = z.infer<typeof ColumnJson>;

export const ColumnText = ColumnAny.extend({
  type: z.literal("text"),
  primary: z.boolean().optional(),
  default: z.string().optional(),
});
export type ColumnText = z.infer<typeof ColumnText>;

export const ColumnUuid = ColumnAny.extend({
  type: z.literal("uuid"),
  autogenerate: z.boolean().optional(),
  primary: z.boolean().optional(),
  default: z.string().uuid().optional(),
});
export type ColumnUuid = z.infer<typeof ColumnUuid>;

export const Column = z.union([
  ColumnDate,
  ColumnInteger,
  ColumnJson,
  ColumnText,
  ColumnUuid,
]);
export type Column = z.infer<typeof Column>;

export const ModelSchema = z.object({
  name: z.string().refine(validIdentifier, {
    message: "model name cannot be used as an identifier ",
  }),
  tableName: z.string(),
  columns: z.record(Column),
});
export type ModelSchema = z.infer<typeof ModelSchema>;

export const DatabaseSchema = z.object({
  models: z.record(ModelSchema),
});
export type DatabaseSchema = z.infer<typeof DatabaseSchema>;
