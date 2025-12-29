# --- Stage 1: Builder ---
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install ALL dependencies (including TypeScript)
RUN npm ci
COPY . .
# Compile TypeScript to JavaScript
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Install ONLY production dependencies (keeps image small)
RUN npm ci --omit=dev
# Copy the compiled code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
