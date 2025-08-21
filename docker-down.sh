#!/bin/bash

docker-compose -f docker-compose.prod.yml down -v

docker system prune -f

docker image rm cast_storyboard_backend
docker image rm cast_storyboard_frontend
docker image rm cast_storyboard_celery
docker image rm cast_storyboard_jupyterhub