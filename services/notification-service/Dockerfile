FROM node:18-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
