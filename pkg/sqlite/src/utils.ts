import { v4 } from "uuid";
import { z } from "zod";

export const MaybeArray = <T extends z.ZodTypeAny>(t: T) =>
  z.union([t, t.array()]);
export type MaybeArray<T> = T | T[];

export function randomUuid(): string {
  return v4();
}
