# Production Dockerfile for Full-Stack App (Express + Vite)
FROM node:20-alpine

WORKDIR /app

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
