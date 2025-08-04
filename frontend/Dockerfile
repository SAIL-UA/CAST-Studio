# Stage 1: Build the React app
FROM node:20.11.0-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and build the app
COPY . ./

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN npm run build

# Stage 2: Serve built files
FROM alpine:latest

WORKDIR /var/www/html

# Install rsync and other utilities
RUN apk add --no-cache rsync bash

# Copy the build output from the build stage
COPY --from=build /app/build /var/www/html

# Create script to copy files to volume and keep container running
RUN echo '#!/bin/bash' > /copy-and-run.sh && \
    echo 'rsync -av --delete /var/www/html/ /shared-build/' >> /copy-and-run.sh && \
    echo 'echo "Frontend build copied to shared volume"' >> /copy-and-run.sh && \
    echo 'tail -f /dev/null' >> /copy-and-run.sh && \
    chmod +x /copy-and-run.sh

# Run the script
CMD ["/copy-and-run.sh"]