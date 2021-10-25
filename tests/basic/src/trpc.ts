import * as trpc from "@trpc/server";
import { Client } from "./sqlite.js";
import { scaffoldDatabase } from "./trpc.generated.js";

export const appRouter = scaffoldDatabase(trpc.router<{ client: Client }>());
export type AppRouter = typeof appRouter;
