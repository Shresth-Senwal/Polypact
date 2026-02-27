# backend/Dockerfile
FROM oven/bun:1-slim
WORKDIR /app

# In case context is repo root
COPY backend/package.json backend/bun.lock* ./ 2>/dev/null || COPY package.json bun.lock* ./
RUN bun install

# In case context is repo root
COPY backend/ . 2>/dev/null || COPY . .

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["bun", "src/index.ts"]
