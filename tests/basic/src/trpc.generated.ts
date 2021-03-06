// This file is automatically generated by @rapid-cg/trpc-generator.
// @generated 36da3a3c-42c7-4bb5-a74d-dc43937c0db6
import * as trpc from "@trpc/server";

import * as Types from "./sqlite.generated.js";

// This is necessary because @trpc/server does not export the Router type (it
// exports LegacyRouter as Router).
/* istanbul ignore next */
class Wrapper<T> {
  wrapped() {
    return trpc.router<T>();
  }
}
type Router<T> = ReturnType<Wrapper<T>["wrapped"]>;

type Context<R> = { client: Types.Client<R> };

export function scaffoldDoc<R>(router: Router<Context<R>>) {
  return router
    .query("findFirst", {
      input: Types.FindFirstDocArgs,
      async resolve({ ctx, input }) {
        return ctx.client.docs.findFirst(input);
      },
    })
    .query("findMany", {
      input: Types.FindManyDocArgs,
      async resolve({ ctx, input }) {
        return ctx.client.docs.findMany(input);
      },
    })
    .mutation("create", {
      input: Types.CreateDocArgs,
      async resolve({ ctx, input }) {
        return ctx.client.docs.create(input);
      },
    })
    .mutation("createMany", {
      input: Types.CreateManyDocArgs,
      async resolve({ ctx, input }) {
        return await ctx.client.docs.createMany(input);
      },
    })
    .mutation("updateMany", {
      input: Types.UpdateManyDocArgs,
      async resolve({ ctx, input }) {
        return await ctx.client.docs.updateMany(input);
      },
    })
    .mutation("deleteMany", {
      input: Types.DeleteManyDocArgs,
      async resolve({ ctx, input }) {
        return await ctx.client.docs.deleteMany(input);
      },
    });
}

export function scaffoldDatabase<R>(router: Router<Context<R>>) {
  return router.merge("docs.", scaffoldDoc<R>(router));
}
