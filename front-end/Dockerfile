# front-end/Dockerfile for larabia-magazine.
# Two stages: vite build → nginx static serve.

FROM node:24.3.0 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time configuration. Both come from docker-compose.yml via --build-arg.
# VITE_API_URL is required; VITE_GOOGLE_CLIENT_ID is required for Google sign-in.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

# --- production stage ---
FROM nginx:latest

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
# Keeps the /assets/ of previous builds (see the script) — the official image
# runs /docker-entrypoint.d/*.sh before nginx starts.
COPY nginx/keep-assets.sh /docker-entrypoint.d/40-keep-assets.sh
RUN chmod 755 /docker-entrypoint.d/40-keep-assets.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
