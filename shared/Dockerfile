# shared/Dockerfile
# Context-aware rescue Dockerfile
FROM oven/bun:1-slim
WORKDIR /app

# Try to find backend from shared context (might need to go up a level if context is project root)
COPY backend/package.json backend/bun.lock* ./ 2>/dev/null || \
     COPY ../backend/package.json ../backend/bun.lock* ./ 2>/dev/null || \
     COPY package.json bun.lock* ./

RUN bun install

COPY backend/ . 2>/dev/null || \
     COPY ../backend/ . 2>/dev/null || \
     COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["bun", "src/index.ts"]
