FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY oracle.js ./
COPY sdk/ ./sdk/
COPY scripts/ ./scripts/
COPY bin/ ./bin/
COPY types/ ./types/
ENV MAINSTREET_ORIGIN=https://avisradar-production.up.railway.app
CMD ["node", "scripts/mcp-server.js"]
