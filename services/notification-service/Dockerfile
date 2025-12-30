# --- Stage 1: Builder ---
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install ALL dependencies (including TypeScript)
RUN npm ci
COPY . .
# Compile the code
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built code
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

# Replace your current CMD with this:
CMD ["node", "dist/src/main.js"]
