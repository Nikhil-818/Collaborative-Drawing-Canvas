# Use Node.js LTS version
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Ensure public/ exists even if repo does not include it
RUN mkdir -p /app/public

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy project files
COPY . .

# Build Next.js app
RUN npm run build

# Runtime image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy build output and required runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server

# Expose ports
EXPOSE 9001 9002

# Start both services (WebSocket server and Next.js)
# In production, you'd typically run these as separate containers
CMD ["sh", "-c", "node server/server.js & npm run start:prod"]
