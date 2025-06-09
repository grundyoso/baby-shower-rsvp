
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { createRsvpInputSchema } from './schema';
import { createRsvp } from './handlers/create_rsvp';
import { getRsvpByPhone } from './handlers/get_rsvp_by_phone';
import { getRsvpDisplays } from './handlers/get_rsvp_displays';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  createRsvp: publicProcedure
    .input(createRsvpInputSchema)
    .mutation(({ input }) => createRsvp(input)),
    
  getRsvpByPhone: publicProcedure
    .input(z.object({
      phoneNumber: z.string().length(10).regex(/^\d{10}$/)
    }))
    .query(({ input }) => getRsvpByPhone(input.phoneNumber)),
    
  getRsvpDisplays: publicProcedure
    .query(() => getRsvpDisplays()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
