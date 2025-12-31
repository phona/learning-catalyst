#!/bin/bash

# OpenSpec Apply Script - Bash version of openspec-apply.ps1
# Applies an OpenSpec change, runs tests, and commits

set -e

# Function to invoke Claude
invoke_claude() {
    local user_prompt="$1"

    echo -e "\033[36m🚀 Invoking Claude with user prompt...\033[0m\n"

    claude -p "$user_prompt" \
        --allowedTools "Bash,Read,Edit,Write" 2>&1

    if [ $? -eq 0 ]; then
        echo -e "\n\033[32m✅ Claude invocation completed successfully.\033[0m"
    else
        echo -e "\n\033[31m❌ Claude invocation failed.\033[0m"
        return 1
    fi
}

# Function to check if all tasks are finished
test_all_tasks_finished() {
    local input_string="$1"

    # If empty, the task is likely archived (no longer in list)
    if [ -z "$input_string" ]; then
        echo -e "\033[32m✅ Task not in list (possibly archived)\033[0m"
        return 0
    fi

    # Check for archived status
    if [[ $input_string == *"archived"* ]]; then
        echo -e "\033[32m✅ Task is archived\033[0m"
        return 0
    fi

    # Use regex to find pattern: numbers / numbers
    if [[ $input_string =~ ([0-9]+)/([0-9]+) ]]; then
        local completed="${BASH_REMATCH[1]}"
        local total="${BASH_REMATCH[2]}"

        if [ "$completed" -ge "$total" ]; then
            echo -e "\033[32m✅ All tasks finished ($completed/$total)\033[0m"
            return 0
        else
            local remaining=$((total - completed))
            echo -e "\033[33m⏳ Pending: $remaining tasks remaining ($completed/$total)\033[0m"
            return 1
        fi
    elif [[ $input_string == *"Complete"* ]]; then
        echo -e "\033[32m✅ No tasks found\033[0m"
        return 0
    else
        echo -e "\033[31m❌ Could not parse task progress from input: $input_string\033[0m" >&2
        return 1
    fi
}

# Main logic
task_id="${1:-}"

if [ -z "$task_id" ]; then
    echo -e "\033[31m❌ Usage: $0 <task_id>\033[0m"
    exit 1
fi

echo -e "\033[36m📋 Processing OpenSpec task: $task_id\033[0m"

# Checkout new branch from develop
echo -e "\n\033[36m🌿 Checking out new branch from 'develop'...\033[0m"
git checkout develop
git pull origin develop
git checkout -b "fix/${task_id}"
echo -e "\033[32m✅ Branch 'fix/${task_id}' created from 'develop'\033[0m"

# Loop until all tasks are finished
while true; do
    task_output=$(openspec list | grep "$task_id" || echo "")

    if test_all_tasks_finished "$task_output"; then
        echo -e "\033[32m🎉 All tasks completed for $task_id\033[0m"
        break
    fi

    echo -e "\033[36m📝 Applying OpenSpec changes...\033[0m"
    invoke_claude "/openspec:apply $task_id"

    echo -e "\n\033[36m🧪 Running tests and checks...\033[0m"
    invoke_claude "write tests for changes. and run tests, lint, type checks. fix all errors"

    echo -e "\n\033[36m⏳ Waiting 5 seconds before next iteration...\033[0m"
    sleep 5
done

# Archive and commit
echo -e "\n\033[36m📦 Archiving OpenSpec change...\033[0m"
invoke_claude "/openspec:archive $task_id"

echo -e "\n\033[36m📝 Committing changes...\033[0m"
invoke_claude "commit all changes of $task_id to git"

echo -e "\n\033[36m🚀 Pushing branch to remote...\033[0m"
git push -u origin "fix/${task_id}"
echo -e "\033[32m✅ Branch 'fix/${task_id}' pushed to remote\033[0m"

echo -e "\n\033[32m✅ OpenSpec apply process completed successfully!\033[0m"
