# Web service Dockerfile (Next.js production server)
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts
RUN npm run build -w apps/web

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/web
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/node_modules /app/node_modules
COPY /app/apps/web/package.json ./package.json
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]