# Stage 1: Build the React app
FROM node:20.11.0-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

RUN npm install
RUN node -v
# Copy source code and build the app
COPY . ./

RUN npm run build

# Stage 2: Copy build artifacts to shared volume
FROM alpine:latest

WORKDIR /var/www/html

# Install rsync for copying files (optional)
RUN apk add --no-cache rsync

# Copy the build output from the build stage to /var/www/html
COPY --from=build /app/build /var/www/html

# Keep the container running
CMD ["tail", "-f", "/dev/null"]