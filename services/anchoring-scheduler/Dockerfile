FROM node:18-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm install

# 2. Copy source code
COPY . .

# 3. BUILD the TypeScript code (This is the missing step!) ⚠️
RUN npm run build

# 4. Start the app from the DIST folder
CMD ["node", "dist/index.js"]