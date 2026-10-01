FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --omit=dev
COPY backend backend
COPY db db
COPY docs/SCENARIOS.md docs/SCENARIOS.md
USER node
EXPOSE 3001
CMD ["node", "backend/src/server.js"]
