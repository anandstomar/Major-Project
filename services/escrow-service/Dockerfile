FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# 1. Install ALL dependencies (including devDependencies like TypeScript)
RUN npm ci

# Copy source code
COPY . .

# 2. Build the project (TypeScript will now successfully compile)
RUN npm run build

RUN cp src/escrow/escrow.json dist/escrow/escrow.json

# 3. Clean up devDependencies to keep the image small and secure
RUN npm prune --production

ENV PORT=8095
EXPOSE 8095

CMD ["node", "dist/main.js"]