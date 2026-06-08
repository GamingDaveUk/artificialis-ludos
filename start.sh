#!/bin/bash

echo "[SYSTEM] Initiating Artificialis Ludos Development Environment..."

# 1. Hook Conda into the bash script session
eval "$(conda shell.bash hook)"

# 2. Launch the Python Backend in a new Konsole window
# We pass the commands to the new window, activate the env, and start uvicorn
konsole --new-tab -e bash -c '
    echo "Booting Backend...";
    eval "$(conda shell.bash hook)";
    conda activate ludos;
    uvicorn backend.main:app --reload;
    exec bash
' &

# 3. Launch the React Frontend in a second new Konsole window
konsole --new-tab -e bash -c '
    echo "Booting Frontend...";
    cd frontend;
    npm run dev;
    exec bash
' &

echo "[SYSTEM] Servers dispatched to separate terminal windows."
