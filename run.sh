#!/bin/bash

SESSION="kalos"

tmux new-session -d -s $SESSION

# Window 1 — DB
tmux rename-window -t $SESSION "db"
tmux send-keys -t $SESSION "cd /Users/dev/Desktop/assess/kalos-assessment && docker start kalos-postgres || docker compose -f docker-compose.yml up -d" C-m

# Window 2 — API
tmux new-window -t $SESSION -n "api"
tmux send-keys -t $SESSION:api "cd /Users/dev/Desktop/assess/kalos-assessment/apps/membergpt-api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000" C-m

# Window 3 — Dashboard
tmux new-window -t $SESSION -n "dashboard"
tmux send-keys -t $SESSION:dashboard "cd /Users/dev/Desktop/assess/kalos-assessment && rm -rf apps/dashboard/.next && pnpm --filter dashboard dev" C-m

# Attach
tmux attach -t $SESSION