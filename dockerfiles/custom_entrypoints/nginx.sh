#!/bin/bash

# -- ENVIRONMENT VARIABLES --
# SERVER_NAME -> domain name publicly accesible

template_file="gwhisp.conf.template"

cd "/etc/nginx/conf.d/"

if [[ ! -e "gwhisp.conf" ]]; then
    if [[ -z "$SERVER_NAME" ]]; then
        echo "[ERROR] ENV variable SERVER_NAME not set."
        exit 0
    fi

    if [[ ! -e "$template_file" ]]; then
        echo "[ERROR] "$template_file" does not exist, cannot generate gwhisp.conf"
        exit 0 
    else
        sed "s#__SERVER_NAME__#$SERVER_NAME#g" < $template_file > gwhisp.conf
    fi
fi

exec nginx -g "daemon off;"