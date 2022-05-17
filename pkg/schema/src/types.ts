import { z, RefinementCtx } from "zod";

function validIdentifier(s: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) return false;
  return true;
}

export const ColumnAny = z.object({
  name: z.string().refine(validIdentifier, { message: "Invalid identifier" }),
  primary: z.boolean().optional(),
  unique: z.boolean().optional(),
  nullable: z.boolean().optional(),
  generatedAs: z.string().optional(),
});
export type ColumnAny = z.infer<typeof ColumnAny>;

export const ColumnBlob = ColumnAny.extend({
  type: z.literal("blob"),
  default: z.instanceof(Buffer).optional(),
});
export type ColumnBlob = z.infer<typeof ColumnBlob>;

export const ColumnBoolean = ColumnAny.extend({
  type: z.literal("boolean"),
  default: z.boolean().optional(),
});
export type ColumnBoolean = z.infer<typeof ColumnBoolean>;

export const ColumnDate = ColumnAny.extend({
  type: z.literal("date"),
  mode: z.enum(["createdAt", "updatedAt"]).optional(),
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
  default: z.unknown().optional(),
});
export type ColumnJson = z.infer<typeof ColumnJson>;

export const ColumnText = ColumnAny.extend({
  type: z.literal("text"),
  default: z.string().optional(),
});
export type ColumnText = z.infer<typeof ColumnText>;

export const ColumnUuid = ColumnAny.extend({
  type: z.literal("uuid"),
  autogenerate: z.boolean().optional(),
  default: z.string().uuid().optional(),
});
export type ColumnUuid = z.infer<typeof ColumnUuid>;

export const Column = z.union([
  ColumnBlob,
  ColumnBoolean,
  ColumnDate,
  ColumnInteger,
  ColumnJson,
  ColumnText,
  ColumnUuid,
]);
export type Column = z.infer<typeof Column>;

export const RelationBase = z.object({
  type: z.literal("relation"),
  relationType: z.enum(["belongsTo", "hasOne", "hasMany"]),
  name: z.string().refine(validIdentifier, { message: "Invalid identifier" }),
  column: z.string(),
  foreignColumn: z.string(),
});

export const ModelSchemaBase = z.object({
  name: z.string().refine(validIdentifier, { message: "Invalid identifier" }),
  tableName: z.string(),
  columns: z.record(Column),
});

export const RelationInput = RelationBase.extend({ foreignModel: z.string() });
export type RelationInput = z.infer<typeof RelationInput>;

export const ModelSchemaInput = ModelSchemaBase.extend({
  relations: z.record(RelationInput),
});
export type ModelSchemaInput = z.infer<typeof ModelSchemaInput>;

export type Relation = z.infer<typeof RelationBase> & {
  foreignModel: ModelSchema;
};

export type ModelSchema = z.infer<typeof ModelSchemaBase> & {
  relations: Record<string, Relation>;
};

export const DatabaseSchemaInput = z.object({
  models: z.record(ModelSchemaInput),
});
export type DatabaseSchemaInput = z.infer<typeof DatabaseSchemaInput>;

export type DatabaseSchema = { models: Record<string, ModelSchema> };
export const DatabaseSchema = DatabaseSchemaInput.superRefine(
  validateDatabaseSchema
).transform(transformDatabaseSchema);

function validateDatabaseSchema(val: DatabaseSchemaInput, ctx: RefinementCtx) {
  Object.values(val.models).forEach((model) => {
    Object.values(model.relations).forEach((relation) => {
      const column = model.columns[relation.column];
      if (!column) {
        ctx.addIssue({
          path: ["models", model.name, "relations", relation.name, "column"],
          code: z.ZodIssueCode.custom,
          message: "Invalid local column",
        });
      }
      const foreignModel = val.models[relation.foreignModel];
      if (!foreignModel) {
        ctx.addIssue({
          path: [
            "models",
            model.name,
            "relations",
            relation.name,
            "foreignModel",
          ],
          code: z.ZodIssueCode.custom,
          message: "Invalid foreign model",
        });
        return;
      }
      const foreignColumn = foreignModel.columns[relation.foreignColumn];
      if (!foreignColumn) {
        ctx.addIssue({
          path: [
            "models",
            model.name,
            "relations",
            relation.name,
            "foreignColumn",
          ],
          code: z.ZodIssueCode.custom,
          message: "Invalid foreign column",
        });
        return;
      }
      if (column && column.type !== foreignColumn.type) {
        ctx.addIssue({
          path: ["models", model.name, "relations", relation.name],
          code: z.ZodIssueCode.custom,
          message: "Local and foreign columns have different types",
        });
      }
    });
  });
}

function transformDatabaseSchema(input: DatabaseSchemaInput): DatabaseSchema {
  const ret: DatabaseSchema = { models: {} };
  Object.values(input.models).forEach((modelInput: ModelSchemaInput) => {
    ret.models[modelInput.name] = { ...modelInput, relations: {} };
  });
  Object.values(input.models).forEach((modelInput) => {
    const model = ret.models[modelInput.name];
    Object.values(modelInput.relations).forEach((relation) => {
      model.relations[relation.name] = {
        ...relation,
        foreignModel: ret.models[relation.foreignModel],
      };
    });
  });
  return ret;
}
