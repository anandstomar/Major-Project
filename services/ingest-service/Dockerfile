FROM node:20-alpine

WORKDIR /app

# 1. Copy package files
COPY package.json package-lock.json* ./

# 2. Install ALL dependencies (including TypeScript)
# We use 'npm install' instead of 'npm ci --production' so we get the 'tsc' compiler
RUN npm install

# 3. Copy source code
COPY . .

# 4. Build the TypeScript code (creates the /dist folder)
RUN npm run build

# 5. Run the compiled JavaScript
CMD ["node", "dist/index.js"]