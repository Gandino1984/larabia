# magazine-front/Dockerfile
FROM node:24.3.0 AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Accept build arguments from docker-compose
ARG VITE_API_URL=https://api.uribarri.online
ARG VITE_GOOGLE_CLIENT_ID=900987294540-hjhjhisdf8rteelki7hd030o2i8ku74p.apps.googleusercontent.com

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:latest

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
