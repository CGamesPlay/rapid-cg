import { v4 } from "uuid";
import { z } from "zod";

import SQL from "./tag.js";

export const MaybeArray = <T extends z.ZodTypeAny>(t: T) =>
  z.union([t, t.array()]);
export type MaybeArray<T> = T | T[];

export function randomUuid(): string {
  return v4();
}

export declare namespace Namespace {
  type Result = { alias: SQL.Template; ns: Namespace };
}

export class Namespace {
  static root(table: string): Namespace.Result {
    return { alias: SQL.id(table), ns: new Namespace("") };
  }

  private constructor(private scope: string) {}

  referenceTable(relation: string): Namespace.Result {
    const alias = this.scope === "" ? relation : `${this.scope}_${relation}`;
    return { alias: SQL.id(alias), ns: new Namespace(alias) };
  }
}
