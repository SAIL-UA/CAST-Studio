# CAST Story Studio

CAST Story Studio is a full-stack application for story generation and management. The project uses a modern Django REST API backend with a React TypeScript frontend.

## Architecture

- **Backend**: Django REST Framework with PostgreSQL database
- **Frontend**: React with TypeScript
- **Authentication**: JWT tokens with HTTP-only cookies
- **Task Queue**: Celery with Redis broker for async operations
- **AI Integration**: OpenAI API for story and description generation

## Prerequisites

- Python 3.12.3 with conda
- Node.js 20.12.2 with npm
- PostgreSQL database
- Redis server (for Celery tasks)

## Development Setup

### Quick Start with Docker Compose

1. **Set up environment variables**:
   Create a `.env` file in the project root with:
   ```env
   DJANGO_SECRET_KEY=your-secret-key
   DJANGO_DEBUG=True
   POSTGRES_DB=cast-db
   POSTGRES_USER=your_postgres_user
   POSTGRES_PASSWORD=your_postgres_password
   POSTGRES_HOST=your_postgres_host
   POSTGRES_PORT=your_postgres_port
   DATA_PATH=/data/CAST_ext/users
   OPENAI_API_KEY=your-openai-api-key
   FRONTEND_URL=http://localhost
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   ```

2. **First-time setup** (run migrations before starting services):
   ```bash
   # Start only the database and redis first
   docker-compose -f docker-compose.dev.yml up -d db redis
   
   # Run migrations (backend will start temporarily just for this)
   docker-compose -f docker-compose.dev.yml run --rm backend sh -c "python manage.py makemigrations && python manage.py migrate"
   
   # Now start all services
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Subsequent startups** (after initial setup):
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

4. **Run additional migrations** (when needed, with services running):
   ```bash
   docker exec backend sh -c "python manage.py makemigrations && python manage.py migrate"
   ```

5. **Create superuser** (optional):
   ```bash
   docker exec -it backend python manage.py createsuperuser
   ```

## Key Features

- **Image Upload & Management**: Upload and organize visual data stories
- **AI-Powered Descriptions**: Generate descriptions for images using OpenAI
- **Story Generation**: Create narratives from visual data with AI assistance
- **Drag & Drop Interface**: Interactive storyboard for organizing content
- **User Authentication**: Secure JWT-based authentication system
- **Async Task Processing**: Long-running tasks handled via Celery

## Deployment

For production deployment, ensure:
1. Set `DJANGO_DEBUG=False` in environment
2. Configure proper PostgreSQL database
3. Set up Redis for Celery tasks
4. Use a process manager like tmux or systemd
5. Configure reverse proxy (nginx) for static files

## Troubleshooting

### Docker Compose Issues
- Run `docker-compose -f docker-compose.dev.yml down` and `docker-compose -f docker-compose.dev.yml up --build` to rebuild containers
- Check container logs: `docker-compose -f docker-compose.dev.yml logs [service-name]`
- Ensure Docker daemon is running
- Verify `.env` file exists in project root

### General Issues
- Check that PostgreSQL and Redis services are running (handled by Docker Compose)
- Verify environment variables are set correctly in `.env` file
- Ensure ports 8076 (backend) and 8050 (frontend) are available
- Check Celery worker is running for AI generation tasks
- For email functionality, ensure EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are configured