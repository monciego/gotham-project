FROM node:24-slim

RUN npm install -g pnpm@9

# Mount points for the node_modules volumes in docker-compose.yml. Creating
# them here owned by "node" makes new volumes inherit that ownership.
RUN mkdir -p \
        /app/node_modules \
        /app/apps/web/node_modules \
        /app/packages/ui/node_modules \
        /app/packages/eslint-config/node_modules \
    && chown -R node:node /app

USER node
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Install only web and the workspace packages it depends on, then start dev.
CMD ["sh", "-c", "pnpm install --frozen-lockfile --filter web... --config.confirmModulesPurge=false && pnpm --filter web exec next dev --hostname 0.0.0.0 --port 3000"]
