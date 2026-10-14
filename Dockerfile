FROM node:22-alpine AS builder

WORKDIR /app

# Toolchain fallback in case better-sqlite3 has no prebuilt binary for musl
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Single-file DB setup script; better-sqlite3 stays external (native addon)
RUN npx esbuild prisma/setup.ts --bundle --platform=node --external:better-sqlite3 --outfile=setup.js

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/setup.js ./setup.js

EXPOSE 3000

# Apply migrations and seed, then start the standalone server
CMD ["sh", "-c", "node setup.js && node server.js"]
