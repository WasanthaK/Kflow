#!/bin/bash

# 🚀 Kflow Azure Deployment Script
# This script automates the deployment of Kflow to Azure Static Web Apps

set -e

echo "🔄 Kflow Azure Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check dependencies
check_dependencies() {
    echo -e "${BLUE}📋 Checking dependencies...${NC}"
    
    if ! command -v az &> /dev/null; then
        echo -e "${RED}❌ Azure CLI is not installed${NC}"
        echo "Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ PNPM is not installed${NC}"
        echo "Install it with: npm install -g pnpm"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies found${NC}"
}

# Build the application
build_app() {
    echo -e "${BLUE}🏗️ Building Kflow application...${NC}"
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    pnpm install --frozen-lockfile
    
    # Build packages
    echo "🔨 Building packages..."
    pnpm --filter @kflow/language build
    pnpm --filter @kflow/studio build
    
    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Deploy to Azure
deploy_to_azure() {
    echo -e "${BLUE}🚀 Deploying to Azure Static Web Apps...${NC}"
    
    # Check if user is logged in
    if ! az account show &> /dev/null; then
        echo "🔐 Please log in to Azure..."
        az login
    fi
    
    # Get resource group name
    read -p "Enter resource group name (default: kflow-rg): " RESOURCE_GROUP
    RESOURCE_GROUP=${RESOURCE_GROUP:-kflow-rg}
    
    # Get app name
    read -p "Enter app name (default: kflow-studio): " APP_NAME
    APP_NAME=${APP_NAME:-kflow-studio}
    
    # Get location
    read -p "Enter location (default: eastus): " LOCATION
    LOCATION=${LOCATION:-eastus}
    
    # Create resource group if it doesn't exist
    echo "📂 Creating resource group '$RESOURCE_GROUP'..."
    az group create --name $RESOURCE_GROUP --location $LOCATION --query "properties.provisioningState" -o tsv
    
    # Create static web app
    echo "🌐 Creating static web app '$APP_NAME'..."
    DEPLOYMENT_TOKEN=$(az staticwebapp create \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --source https://github.com/WasanthaK/Kflow \
        --location $LOCATION \
        --branch main \
        --app-location "/packages/studio" \
        --output-location "dist" \
        --login-with-github \
        --query "repositoryToken" -o tsv)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Azure Static Web App created successfully!${NC}"
        
        # Get the app URL
        APP_URL=$(az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "defaultHostname" -o tsv)
        echo -e "${GREEN}🌐 Your app will be available at: https://$APP_URL${NC}"
        
        echo -e "${YELLOW}⏳ Note: It may take a few minutes for the initial deployment to complete.${NC}"
        echo -e "${BLUE}📊 Monitor deployment progress at: https://portal.azure.com${NC}"
        
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
}

# Set up GitHub Actions (if token is available)
setup_github_actions() {
    if [ ! -z "$DEPLOYMENT_TOKEN" ]; then
        echo -e "${BLUE}⚙️ Setting up GitHub Actions...${NC}"
        echo "Add this secret to your GitHub repository:"
        echo -e "${YELLOW}AZURE_STATIC_WEB_APPS_API_TOKEN${NC}"
        echo "Value: $DEPLOYMENT_TOKEN"
        echo ""
        echo "GitHub Actions workflow is already configured in .github/workflows/azure-static-web-apps.yml"
        echo -e "${GREEN}✅ Future pushes to main branch will automatically deploy${NC}"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}"
    echo "🔄 =================================="
    echo "   Kflow Azure Deployment Script"
    echo "===================================${NC}"
    echo ""
    
    check_dependencies
    build_app
    deploy_to_azure  
    setup_github_actions
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}📖 For more deployment options, see: AZURE_DEPLOYMENT.md${NC}"
}

# Run main function
main "$@"