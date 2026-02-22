FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build

RUN cp src/escrow/escrow.json dist/escrow/escrow.json

RUN npm prune --production

ENV PORT=8095
EXPOSE 8095

CMD ["node", "dist/main.js"]