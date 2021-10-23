import { v4 } from "uuid";

export function randomUuid(): string {
  return v4();
}
