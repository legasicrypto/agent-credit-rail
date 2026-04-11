FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm install --frozen-lockfile

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @agent-credit-rail/demo-ui build

FROM node:22-slim
RUN npm install -g serve
COPY --from=build /app/apps/demo-ui/dist /app
EXPOSE 4030
CMD ["serve", "-s", "/app", "-l", "4030"]
