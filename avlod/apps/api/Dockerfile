# Production image for the AVLOD API. Build from the `avlod/` application directory:
#   docker build -f apps/api/Dockerfile -t avlod-api .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci --workspace @avlod/api --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
# Dev dependencies are kept: the Prisma CLI is needed for `migrate deploy` at start-up.
RUN npm run build -w @avlod/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci --workspace @avlod/api --include-workspace-root=false --omit=dev
COPY --from=build /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 4000
# Apply committed migrations, then start. Never runs `migrate reset`.
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/server.js"]
