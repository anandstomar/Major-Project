# Use Node 22 (LTS) to satisfy Prisma requirements
FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install ALL dependencies (including devDependencies like @nestjs/cli)
# We need these to compile the TypeScript code
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# 1. Generate Prisma Client
# This creates the types your code is trying to import
RUN npx prisma generate

# 2. Build the NestJS application
# This compiles src/main.ts -> dist/main.js
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

# 3. Point to the correct NestJS entry file
CMD ["node", "dist/src/main.js"]