import * as trpc from "@trpc/server";

import * as Types from "./sqlite.generated.js";

type Router = ReturnType<typeof trpc.router>;

export function scaffoldDoc(router: Router, client: Types.Client) {
  return router
    .query("findFirst", {
      input: Types.FindFirstDocArgs,
      async resolve({ input }) {
        return client.docs.findFirst(input);
      },
    })
    .query("findMany", {
      input: Types.FindManyDocArgs,
      async resolve({ input }) {
        return client.docs.findMany(input);
      },
    })
    .mutation("create", {
      input: Types.CreateDocArgs,
      async resolve({ input }) {
        return client.docs.create(input);
      },
    })
    .mutation("createMany", {
      input: Types.CreateManyDocArgs,
      async resolve({ input }) {
        await client.docs.createMany(input);
      },
    })
    .mutation("updateMany", {
      input: Types.UpdateManyDocArgs,
      async resolve({ input }) {
        await client.docs.updateMany(input);
      },
    })
    .mutation("deleteMany", {
      input: Types.DeleteManyDocArgs,
      async resolve({ input }) {
        await client.docs.deleteMany(input);
      },
    });
}

export function scaffoldDatabase(router: Router, client: Types.Client) {
  return router.merge("docs.", scaffoldDoc(trpc.router(), client));
}
