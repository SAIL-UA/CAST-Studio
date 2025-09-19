#!/bin/bash

DO_SETUP=false
DO_MIGRATE=false

set -e
set -u
set -o pipefail
set -x

. .env

function usage() {
    echo "Usage: ./config.sh [setup|migrate] <args>"
    echo
    echo "Subcommands:"
    echo -e "\tsetup <user>: first-run repo configuration"
    # echo -e "\t           [!] sign up in webapp before calling"
    echo -e "\tmigrate: run after model update"
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi
if [[ $1 == "migrate" ]]; then
    DO_MIGRATE=true
elif [[ $1 == "setup" ]]; then
    if [[ $# -ne 2 ]]; then
        usage
        exit 1
    fi

    USERNAME="$2"
    
    DO_SETUP=true
    DO_MIGRATE=true
else
    usage
    exit 1
fi

COMPOSE_FILE="docker-compose.yml"

if [ $DO_SETUP = true ]; then
    echo "> Checking venv..."
    pushd backend >/dev/null
    if ! python3 manage.py &>/dev/null; then
        echo "> Please activate and configure python venv"
        exit 2
    fi
    popd >/dev/null
    echo "OK"
    echo
    docker-compose -f $COMPOSE_FILE up -d
    echo "Visit $FRONTEND_URL and be sure to sign up with the username $USERNAME."
    echo
    read -p "Press ENTER to continue" </dev/tty
    echo
    docker-compose -f $COMPOSE_FILE stop
    echo
fi

if [ $DO_MIGRATE = true ]; then

    echo "> Make local migrations"
    pushd backend
    if ! python3 manage.py makemigrations; then
        echo "> Please activate and configure python venv"
        exit 2
    fi
    popd
    echo

    echo "> Migrate containers"
    COMPOSE_FILE="docker-compose.dev.yml"
    docker-compose -f $COMPOSE_FILE up -d db redis
    docker-compose -f $COMPOSE_FILE stop backend
    docker-compose -f $COMPOSE_FILE run --rm backend sh -c "python manage.py makemigrations && python manage.py migrate"
    docker-compose -f $COMPOSE_FILE stop db redis
    echo
fi

if [ $DO_SETUP = true ]; then
    # bring up db container to exec in running env
    docker-compose -f $COMPOSE_FILE --env-file .env up -d db
    echo

    echo -n "> Query user id: "
    USERID=$(docker-compose -f $COMPOSE_FILE exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "select id from users where username='$USERNAME';")
    echo "$USERID"
    
    echo "> Copy test images to cache dir"
    CACHEDIR=data/users/$USERNAME/workspace/cache
    mkdir -p "$CACHEDIR"
    cp tmp_dev_test_images/*.png "$CACHEDIR" 

    echo "> Create django superuser (username: ${USERNAME})"
    # set +eu
    set +o pipefail
    docker-compose -f $COMPOSE_FILE run --rm \
        -e DJANGO_SUPERUSER_USERNAME="${USERNAME}" \
        -e DJANGO_SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL}" \
        -e DJANGO_SUPERUSER_PASSWORD="${DJANGO_SUPERUSER_PASSWORD}" \
        backend python manage.py createsuperuser --no-input
    echo
    set -e
    set -u
    set -o pipefail

    echo "> Insert test images into db"
    cat tmp_dev_test_images/insert_image_data.sql | sed "s/{{userid}}/${USERID// /}/g" |\
    docker-compose -f $COMPOSE_FILE exec -T db psql -U $POSTGRES_USER -d $POSTGRES_DB
    echo

    # bring db container back down 
    docker-compose -f $COMPOSE_FILE stop db
    echo
fi

echo "> Build and bring up containers"
docker-compose -f $COMPOSE_FILE up -d --build
# powershell.exe -Command "docker-compose -f $COMPOSE_FILE up -d --build"