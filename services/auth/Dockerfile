FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json* /app/dist ./
RUN npm ci --omit=dev
EXPOSE 8090
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
