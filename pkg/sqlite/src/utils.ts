import { v4 } from "uuid";

export type MaybeArray<T> = T[] | T;

export function randomUuid(): string {
  return v4();
}
