# Build stage: compiles the TypeScript sources with the dev dependencies available.
FROM node:22-slim AS build
WORKDIR /repo
ENV CI=true

COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/install.mjs
COPY apps/api/package.json apps/api/
RUN npm ci --include-workspace-root --workspace @golden-raspberry/api

COPY apps/api apps/api
RUN npm run build --workspace @golden-raspberry/api

# Runtime stage: production dependencies only. NODE_ENV=production keeps pino on the JSON
# transport, which is why the pretty transport can stay a dev dependency.
FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production PORT=3000

COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/install.mjs
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --include-workspace-root --workspace @golden-raspberry/api \
  && npm cache clean --force

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/data apps/api/data

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
