FROM nginx:alpine

# Copy custom nginx configuration
COPY project.conf /etc/nginx/conf.d/default.conf

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 