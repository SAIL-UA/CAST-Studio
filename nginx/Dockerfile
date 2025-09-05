FROM nginx:alpine

# Copy custom nginx configuration
COPY project.conf /etc/nginx/conf.d/default.conf

# Create log directory
RUN mkdir -p /var/log/nginx
# Create staticfiles directory and set permissions
RUN mkdir -p /app/staticfiles
RUN chmod 755 /app/staticfiles

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 