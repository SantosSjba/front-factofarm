FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Env de producción embebidos en el build Angular (sync-env.mjs lee .env)
ARG NG_APP_API_BASE_URL=https://api-factofarm.factosysperu.com/api/v1
ARG NG_APP_PRODUCTION=true
ARG NG_APP_SITE_URL=https://factofarm.factosysperu.com
RUN printf '%s\n' \
  "NG_APP_API_BASE_URL=${NG_APP_API_BASE_URL}" \
  "NG_APP_PRODUCTION=${NG_APP_PRODUCTION}" \
  "NG_APP_SITE_URL=${NG_APP_SITE_URL}" > .env \
  && NODE_ENV=production pnpm run build

FROM nginx:1.27-alpine AS runner
# curl: Coolify HEALTHCHECK dentro del contenedor
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/front-factofarm/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
