# CAST Story Studio

CAST Story Studio is a full-stack application for story generation and management. The project uses a modern Django REST API backend with a React TypeScript frontend.

## Sprint board

Day-to-day sprint work lives in Jira. See [jira.md](jira.md) for how epics, stories, subtasks, and one-off tasks are organized, and who to contact for board access.

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

    Copy `.env.example` to `.env` in the project root and fill in the blank values (secrets, database credentials, API keys, email). `.env.example` is a development template; reset the insecure defaults before deploying to production.

    **It will probably be much easier to just reach out to Taha Hassan _(thassan1@ua.edu)_ for the dev `.env` file, so feel free to do that.**

2. **First-time setup** (run migrations before starting services):

    Backend, Daphne, and Celery default to `backend/Dockerfile.dev`. On an ARM machine (for example Apple Silicon), change those `dockerfile:` entries in `docker-compose.dev.yml` to `Dockerfile.arm`.

    Next, we'll want to generate the migrations locally, so that they can be copied to the backend container at runtime:

    ```bash
    cd backend
    python manage.py makemigrations
    cd ..
    ```

    Now we can push the migrations to the postgres database in the docker container:

    ```bash
    # Start only the database and redis first
    docker-compose -f docker-compose.dev.yml up -d db redis

    # Run migrations (backend will start temporarily just for this)
    docker-compose -f docker-compose.dev.yml run --rm backend sh -c "python manage.py makemigrations && python manage.py migrate"

    # Now start all services
    docker-compose -f docker-compose.dev.yml up --build
    ```

3. **Create superuser** (optional):

    ```bash
    # Being a super-user will allow you to access the admin page at localhost/admin
    docker exec -it cast-backend-dev python manage.py createsuperuser
    ```

4. **Subsequent takedown/startups** (after initial setup):

    ```bash
    # To take all services down
    docker-compose -f docker-compose.dev.yml down

    # To bring all services up
    docker-compose -f docker-compose.dev.yml up
    ```

5. **Run additional migrations** (only needed when changes are made to `/backend/api/models.py` or `/backend/users/models.py`):
    ```bash
    # Ensure services are running before executing this command
    docker exec cast-backend-dev sh -c "python manage.py makemigrations && python manage.py migrate"
    ```

## Key Features

- **Image Upload & Management**: Upload and organize visual data stories
- **AI-Powered Descriptions**: Generate descriptions for images using OpenAI
- **Story Generation**: Create narratives from visual data with AI assistance
- **Drag & Drop Interface**: Interactive storyboard for organizing content
- **User Authentication**: Secure JWT-based authentication system
- **Async Task Processing**: Long-running tasks handled via Celery

## Deployment

Production runs the same Docker layout as development: nginx is the only public HTTP(S) entry (ports 80/443), and it serves the frontend build and proxies `/api`, `/users`, `/admin`, and `/ws`. Redis and JupyterHub stay on the compose network; they are not published to the host.

Use `docker-compose.prod.yml` (see `docker-up.sh`). Keep `DJANGO_DEBUG=False` in `.env`. The named `cast-network` is created by `docker-up.sh` and is `external` so JupyterHub can share it.

## Troubleshooting

### Docker Compose Issues

- Run `docker-compose -f docker-compose.dev.yml down` and `docker-compose -f docker-compose.dev.yml up --build` to rebuild containers
- Check container logs: `docker-compose -f docker-compose.dev.yml logs [service-name]`
- Ensure Docker daemon is running
- Verify `.env` file exists in project root

### General Issues

- Check that PostgreSQL and Redis services are running (handled by Docker Compose)
- Verify environment variables are set correctly in `.env` file
- Ensure port 80 is available (nginx is the only published port; the app is at http://localhost)
- Check Celery worker is running for AI generation tasks
- For email functionality, ensure EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are configured
