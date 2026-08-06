# Stage 1: Build Frontend Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Serve static files with Nginx on Port 80
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration (Nginx listens on port 80, NOT 3000)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose Nginx web server port (Port 80)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
