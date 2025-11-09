# API service Dockerfile (monorepo-aware)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/vanna/package.json services/vanna/package.json
RUN npm ci --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts
RUN npm run build -w apps/api

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules /app/node_modules
COPY /app/apps/api/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]