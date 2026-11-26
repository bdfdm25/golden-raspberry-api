# Build stage: produces the static bundle.
FROM node:22-slim AS build
WORKDIR /repo
ENV CI=true

COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/install.mjs
COPY apps/web/package.json apps/web/
RUN npm ci --include-workspace-root --workspace @golden-raspberry/web

COPY apps/web apps/web
RUN npm run build --workspace @golden-raspberry/web

# Runtime stage: nginx serves the bundle and proxies /api to the API container.
FROM nginx:1.29-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/web/browser /usr/share/nginx/html
EXPOSE 80
