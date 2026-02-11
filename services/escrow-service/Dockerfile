FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

# build (if you want to ship TS built code)
RUN npm run build

ENV PORT=8095
EXPOSE 8095
CMD ["node", "dist/main.js"]
