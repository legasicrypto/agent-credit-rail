FROM node:22-slim
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
RUN npm install -g tsx
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm install --frozen-lockfile

ARG APP_ENTRYPOINT
ENV APP_ENTRYPOINT=${APP_ENTRYPOINT}

ARG PORT=4010
EXPOSE ${PORT}

CMD tsx ${APP_ENTRYPOINT}
