# --- Stage 1: Builder ---
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# Install ALL dependencies (including Nest CLI)
RUN npm ci
COPY . .
# Compile the NestJS app
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# Install ONLY production dependencies
RUN npm ci --omit=dev
# Copy the built code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
