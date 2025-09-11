FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpam0g-dev \
    gcc \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt /app/

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create necessary directories
RUN mkdir -p /data/CAST_ext/users
RUN chmod -R 755 /data/CAST_ext/users

# Set permissions for STATIC_ROOT
RUN mkdir -p /app/staticfiles
RUN chmod 755 /app/staticfiles

# Expose port
EXPOSE 8051

CMD ["python", "manage.py", "makemigrations"]
CMD ["python", "manage.py", "migrate"]
# Command to run Gunicorn
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8051", "--workers", "3"]