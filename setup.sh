#!/bin/bash

# Setup/helper script for gWhisp
# Author: Airán 'Gurguii' Gómez

function help()
{
    cat << EOF
Setup script for Whisper Web GUI
Author: Airán 'Gurguii' Gómez

--- General Options ---
-h | --help : show this message

--- Node Options ---
-nlp | --node-listen-port <port> : set the whisper listen port, default 3000

--- WebServer Options ---
-wlp | --web-listen.port <port> : set the webserver listen port, default 9001


--- Docker Options ---
--build-all-images      : builds all images inside dockerfiles/ (nginx,nodejs,webgui,whisperworker)
-b   | --build <image|all>  : build desired image (frontend|backend|balancer|worker) or all
EOF

}

function buildAllImages()
{
    # Log variables
    local webguiStdout=".webgui_out.log"
    local webguiStderr=".webgui_err.log"

    local backendStdout=".backend_out.log"
    local backendStderr=".backend_err.log"
    
    local lbStdout=".lb_out.log"          
    local lbStderr=".lb_err.log"          
    
    local workerStdout=".worker_out.log"  
    local workerStderr=".worker_err.log"  

    echo ": Building frontend image gwhisp/frontend"
    # 0. build frontend
    if ! docker build -t gwhisp/frontend -f dockerfiles/Dockerfile.webgui . 1> "$webguiStdout" 2> "$webguiStderr"; then
        # Handle failure here if needed
        echo "Error building frontend image. Check $webguiStderr"
        return 1
    fi

    echo ": Building backend image gwhisp/backend"
    # 1. build backend
    if ! docker build -t gwhisp/backend -f dockerfiles/Dockerfile.nodejs . 1> "$backendStdout" 2> "$backendStderr"; then
        # Handle failure here if needed
        echo "Error building backend image. Check $backendStderr"
        return 1
    fi

    echo ": Building load balancer image gwhisp/lb"
    # 2. build load balancer
    if ! docker build -t gwhisp/lb -f dockerfiles/Dockerfile.nginx . 1> "$lbStdout" 2> "$lbStderr"; then
        # Handle failure here if needed
        echo "Error building load balancer image. Check $lbStderr"
        return 1
    fi

    echo ": Building whisper worker image gwhisp/worker"
    # 3. build whisper worker
    if ! docker build -t gwhisp/worker -f dockerfiles/Dockerfile.whisperworker . 1> "$workerStdout" 2> "$workerStderr"; then
        # Handle failure here if needed
        echo "Error building worker image. Check $workerStderr"
        return 1
    fi

    echo "All images built successfully."
    return 0
}

function buildImage()
{
    local target="$1"

    case "$target" in
        frontend)
        docker build -t gwhisp/frontend -f dockerfiles/Dockerfile.webgui .
        ;;
        backend)
        docker build -t gwhisp/backend -f dockerfiles/Dockerfile.nodejs .
        ;;
        worker)
        docker build -t gwhisp/worker -f dockerfiles/Dockerfile.whisperworker .
        ;;
        balancer)
        docker build -t gwhisp/balancer -f dockerfiles/Dockerfile.nginx .
        ;;
        all)
        buildAllImages
        ;;
        * )
        echo "Invalid image $target, please run -h | --help"
        ;; 
    esac

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
    # 1. Capture all command-line arguments into the args array
    local args=("$@")
    local argc="${#args[@]}"
    
    # Check for the 'docker' dependency
    dependencyCheck docker

    # 2. Use a C-style loop for index-based iteration (lookahead)
    for ((i = 0; i < argc; i++)); do
        
        # Get the current option and convert to lowercase for comparison
        local opt="${args[i]}"
        local opt_lower="${opt,,}"
        
        if [[ "$opt_lower" == "-h" || "$opt_lower" == "--help" ]]; then
            help && exit 0
        
        elif [[ "$opt_lower" == "-b" || "$opt_lower" == "--build" ]]; then
            
            # 3. Check for the next argument (lookahead)
            if [[ $((i + 1)) -lt "$argc" ]]; then
                # The next argument is at index i + 1
                local image_name="${args[i+1]}"
                
                # Pass the image name/tag to the function
                buildImage "$image_name" && exit 0
                
                # IMPORTANT: Increment the index to consume the image name argument
                ((i++)) 
            else
                echo "Error: Option '$opt' requires an argument (image name/tag)." >&2
                help
                exit 1
            fi
        fi
    done
    
    # Default when no arguments given
    help
}

main $@