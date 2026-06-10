FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

RUN pnpm run build

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.build.json ./

RUN mkdir -p /app/data /app/uploads

EXPOSE 3001

CMD ["node", "dist/main.js"]
