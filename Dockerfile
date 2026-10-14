# togetherfit production image (Next.js standalone server).
# Build:  docker build -t togetherfit .
# Run:    see docker-compose.yml and docs/self-hosting.md

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public build-time setting (the bot-check widget key); pass with --build-arg.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 togetherfit
COPY --from=build --chown=togetherfit /app/.next/standalone ./
COPY --from=build --chown=togetherfit /app/.next/static ./.next/static
COPY --from=build --chown=togetherfit /app/public ./public
# Migration script and schema, run with: docker compose run --rm app node db/migrate.mjs
COPY --from=build --chown=togetherfit /app/db ./db
COPY --from=build --chown=togetherfit /app/scripts ./scripts
USER togetherfit
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
