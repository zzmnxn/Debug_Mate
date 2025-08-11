#!/bin/bash

# DebugMate API Key Auto-Update Script
# This script automatically updates the Gemini API key for the server

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
BACKUP_FILE="$PROJECT_ROOT/.env.backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}DebugMate API Key Update Script${NC}"
echo "=================================="

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script is designed for Linux environments${NC}"
    exit 1
fi

# Function to backup current .env file
backup_env() {
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}Backed up current .env file${NC}"
    fi
}

# Function to restore .env file
restore_env() {
    if [[ -f "$BACKUP_FILE" ]]; then
        cp "$BACKUP_FILE" "$ENV_FILE"
        echo -e "${GREEN}Restored .env file from backup${NC}"
    fi
}

# Function to update API key in .env file
update_api_key() {
    local new_key="$1"
    
    if [[ -f "$ENV_FILE" ]]; then
        # Update existing GEMINI_API_KEY
        sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$new_key/" "$ENV_FILE"
    else
        # Create new .env file
        echo "GEMINI_API_KEY=$new_key" > "$ENV_FILE"
    fi
    
    echo -e "${GREEN}Updated API key in .env file${NC}"
}

# Function to restart server (if running)
restart_server() {
    echo -e "${YELLOW}Restarting server to apply new API key...${NC}"
    
    # Check if server is running
    if pgrep -f "node.*server" > /dev/null; then
        echo "Stopping existing server..."
        pkill -f "node.*server" || true
        sleep 2
    fi
    
    # Start server in background
    cd "$PROJECT_ROOT"
    nohup npm start > server.log 2>&1 &
    echo -e "${GREEN}Server restarted with new API key${NC}"
}

# Function to validate API key
validate_api_key() {
    local api_key="$1"
    
    if [[ -z "$api_key" ]]; then
        echo -e "${RED}Error: API key cannot be empty${NC}"
        return 1
    fi
    
    # Basic validation (you can add more sophisticated checks)
    if [[ ${#api_key} -lt 20 ]]; then
        echo -e "${RED}Error: API key seems too short${NC}"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    echo -e "${YELLOW}Please enter your new Gemini API key:${NC}"
    read -s -p "API Key: " NEW_API_KEY
    echo
    
    # Validate the API key
    if ! validate_api_key "$NEW_API_KEY"; then
        echo -e "${RED}Invalid API key. Exiting.${NC}"
        exit 1
    fi
    
    # Backup current configuration
    backup_env
    
    # Update API key
    update_api_key "$NEW_API_KEY"
    
    # Restart server if requested
    echo -e "${YELLOW}Do you want to restart the server now? (y/n):${NC}"
    read -p "" RESTART_CHOICE
    
    if [[ "$RESTART_CHOICE" =~ ^[Yy]$ ]]; then
        restart_server
    else
        echo -e "${BLUE}Server restart skipped. You can restart manually with: npm start${NC}"
    fi
    
    echo -e "${GREEN}API key update completed successfully!${NC}"
    echo -e "${BLUE}Note: Remember to update your API key every few hours${NC}"
}

# Error handling
trap 'echo -e "${RED}Error occurred. Restoring backup...${NC}"; restore_env; exit 1' ERR

# Run main function
main "$@"
