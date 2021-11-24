import { z } from "@rad/sqlite";
import {
  createClient as createUnrefinedClient,
  Doc as BaseDoc,
} from "./sqlite.generated.js";

export * from "./sqlite.generated.js";

export const Doc = BaseDoc.extend({
  extra: z.object({ author: z.string().optional() }),
});
export type Doc = z.infer<typeof Doc>;

export function createClient() {
  return createUnrefinedClient<{ docs: Doc }>(":memory:");
}
export type Client = ReturnType<typeof createClient>;
