#!/bin/bash

docker network create cast-network

docker-compose -f docker-compose.prod.yml build --no-cache

docker-compose -f docker-compose.prod.yml up -d