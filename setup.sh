#!/bin/bash

# Setup script for Whisper Web GUI
# Author: Airán 'Gurguii' Gómez

# Script summary:
# - Dependency checks for required tools (node, python and so on)
# - Parse user options
# - Setup node server (install required modules)
# - Change node/.env.template ENV variables with user preferences
# - Start node server
# - Setup server with python -m venv http.server
# - Summarize the user the setup process (web listen port, node listen port, etc.)

# BEG - Default variables

source .env

# END - Default variables

function help()
{
    cat << EOF
Setup script for Whisper Web GUI
Author: Airán 'Gurguii' Gómez

--- General Options ---
-h | --help : show this message

--- Node Options ---
-nlp | --node-listen-port : set the whisper listen port, default 3000

--- WebServer Options ---
-wlp | --web-listen.port : set the webserver listen port, default 9001


--- Docker Options ---

EOF

}

function dependencyCheck()
{
    local dependencies="$@"

    for dependency in ${dependencies[@]}; do
        if ! command -v "$dependency" &>/dev/null; then
            printf "Missing command '%s'\n" "$dependency" && exit 0
        fi
    done
}

function main()
{
    args=($@)
    argc="${#args[@]}"

    for opt in ${args[@]}; do
        opt=${opt,,}
        if [[ "$opt" == "-h" || "$opt" == "--help" ]]; then
            help && exit 0
        fi
    done

    dependencyCheck "node" "npm" "python"
}

main $@