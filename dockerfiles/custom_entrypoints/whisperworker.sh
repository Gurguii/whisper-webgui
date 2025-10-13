#!/bin/bash

models="
    tiny-q8_0
    base-q8_0
    small-q8_0
    medium-q8_0
    large-v3
    large-v3-turbo-q8_0
"
src="https://huggingface.co/ggerganov/whisper.cpp"
pfx="resolve/main/"

args=("$@")
argc="${#args[@]}"

for (( i = 0; i < argc; ++i)); do
    opt=${args[i]}

    if [[ "$opt" == "-m" ]]; then
        current_desired_model_path=${args[++i]};
        model_name=$(cut -d/ -f4 <<< "$current_desired_model_path")

        if ! ls /app/models/"$model_name" &>/dev/null; then
            # Current module hasn't been downloaded
            echo ": Downloading server model $model_name"
            curl -L --output /app/models/"$model_name" "$src"/"$pfx""$model_name"
        else
            echo ": Server model "$model_name" already exists"
        fi
    fi
done

for model in $models; do
    full_model_name="ggml-"$model".bin"
    if ! ls /app/models/$full_model_name &>/dev/null; then
        # Download the rest of the models in the background
        curl -L --output /app/models/$full_model_name "$src"/"$pfx""$full_model_name" &>/dev/null &
    else
        echo ": Model "$full_model_name" already exists"
    fi
done

exec /app/whisper-server $@