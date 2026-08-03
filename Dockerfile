FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app/generated ./app/generated
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/public ./public

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# On startup: setup DB (apply migrations + seed if new) then start
CMD ["sh", "-c", "node -e \"require('tsx').install()\" 2>/dev/null; npx tsx prisma/setup.ts && npm start"]
