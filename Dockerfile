# Back-end Dockerfile for larabia-magazine.
# The front-end has its own Dockerfile at front-end/Dockerfile.

FROM node:24.3.0

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pre-create the upload directories so multer never has to create them at request time
# (mkdir at runtime needs writable permissions, which on some hosts requires root).
RUN mkdir -p /app/back-end/uploads/magazine \
            /app/back-end/uploads/article_blocks \
            /app/back-end/uploads/author-profiles \
            /app/back-end/uploads/user-profiles \
            /app/back-end/assets/images/magazine/projects && \
    find /app/back-end/uploads -type d -exec chmod 755 {} + && \
    find /app/back-end/assets -type d -exec chmod 755 {} + && \
    chown -R node:node /app/back-end/uploads /app/back-end/assets

EXPOSE 3000

CMD ["node", "back-end/index.js"]
