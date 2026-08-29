# Production Dockerfile for V79 Marketing Hub (Express + Vite)
FROM node:22-alpine

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (including devDependencies needed for build)
RUN npm install

# Copy application source
COPY . .

# Build frontend static assets and server bundle
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3070

# Expose port 3070
EXPOSE 3070

# Start production server
CMD ["npm", "start"]
