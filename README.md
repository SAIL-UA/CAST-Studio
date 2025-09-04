# CAST Story Studio

CAST Story Studio is a full-stack application for story generation and management. The project uses a modern Django REST API backend with a React TypeScript frontend.

## Architecture

- **Backend**: Django REST Framework with PostgreSQL database
- **Frontend**: React with TypeScript
- **Authentication**: JWT tokens with HTTP-only cookies
- **Task Queue**: Celery with Redis broker for async operations
- **AI Integration**: OpenAI API for story and description generation

## Prerequisites

- Python 3.8+ with conda
- Node.js 16+ with npm
- PostgreSQL database
- Redis server (for Celery tasks)

## Development Setup

### Backend (Django)

1. **Navigate to backend directory and activate environment**:
   ```bash
   cd backend
   conda activate cast
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   Create a `.env` file in the project root with:
   ```env
   DJANGO_SECRET_KEY=your-secret-key
   DJANGO_DEBUG=True
   POSTGRES_DB=cast_db
   POSTGRES_USER=cast_user
   POSTGRES_PASSWORD=your-password
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   DATA_PATH=/path/to/user/data
   OPENAI_API_KEY=your-openai-key
   FRONTEND_URL=http://localhost:8050
   ```

4. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Create superuser** (optional):
   ```bash
   python manage.py createsuperuser
   ```

6. **Start the backend server**:
   ```bash
   python manage.py runserver 8076
   ```

7. **Start Celery worker** (in separate terminal):
   ```bash
   celery -A config worker --loglevel=info
   ```

### Frontend (React)

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   conda activate cast
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend server**:
   ```bash
   npm start
   ```

## Port Configuration

### Development
- **Backend**: Port 8076
- **Frontend**: Port 8050 (configured in package.json)

### Production
- **Backend**: Port 8051
- **Frontend**: Port 8050 (proxies to backend at port 8051)
- Frontend proxy configured in `package.json` points to `http://172.16.22.6:8051`

## Key Features

- **Image Upload & Management**: Upload and organize visual data stories
- **AI-Powered Descriptions**: Generate descriptions for images using OpenAI
- **Story Generation**: Create narratives from visual data with AI assistance
- **Drag & Drop Interface**: Interactive storyboard for organizing content
- **User Authentication**: Secure JWT-based authentication system
- **Async Task Processing**: Long-running tasks handled via Celery

## Development Commands

### Backend
```bash
# Run tests
python manage.py test

# Run linting
ruff check .
ruff format .

# Create migrations
python manage.py makemigrations

# Django shell
python manage.py shell
```

### Frontend
```bash
# Run tests
npm test

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

## Database

The application uses PostgreSQL with custom models:
- **User**: Custom user authentication
- **ImageData**: Visual content metadata
- **NarrativeCache**: Generated stories and analysis
- **UserAction**: Activity logging
- **JupyterLog**: Code execution logs

## Deployment

For production deployment, ensure:
1. Set `DJANGO_DEBUG=False` in environment
2. Configure proper PostgreSQL database
3. Set up Redis for Celery tasks
4. Use a process manager like tmux or systemd
5. Configure reverse proxy (nginx) for static files

## Troubleshooting

- Check that PostgreSQL and Redis services are running
- Verify environment variables are set correctly
- Ensure ports 8076 (backend) and 8050 (frontend) are available
- Check Celery worker is running for AI generation tasks