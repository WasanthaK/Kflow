# 🚀 Azure Deployment Guide for Kflow

## Quick Deploy to Azure Static Web Apps

### **Option 1: One-Click Deploy (Recommended)**

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.StaticApp)

1. Click the "Deploy to Azure" button above
2. Fill in the required fields:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `kflow-studio` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Source**: GitHub
   - **Repository**: `WasanthaK/Kflow`
   - **Branch**: `main`
   - **Build Presets**: React
   - **App location**: `/packages/studio`
   - **Output location**: `dist`

3. Click "Review + Create" → "Create"
4. Azure will automatically set up CI/CD with GitHub Actions

### **Option 2: Azure CLI Deploy**

```bash
# Install Azure CLI (if not already installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Create resource group
az group create --name kflow-rg --location eastus

# Create static web app
az staticwebapp create \
  --name kflow-studio \
  --resource-group kflow-rg \
  --source https://github.com/WasanthaK/Kflow \
  --location eastus \
  --branch main \
  --app-location "/packages/studio" \
  --output-location "dist" \
  --login-with-github
```

### **Option 3: Manual GitHub Integration**

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new "Static Web App" resource
3. Connect to your GitHub repository
4. Configure build settings:
   - **App location**: `/packages/studio`
   - **Output location**: `dist`
   - **Build preset**: React

## 🔧 **Pre-Deployment Checklist**

### 1. Build Verification
```bash
# Test local build
cd /workspaces/Kflow
pnpm install
pnpm build

# Test studio specifically
cd packages/studio
pnpm build
pnpm preview
```

### 2. Environment Variables (Optional)
If you want to pre-configure OpenAI integration:

```bash
# In Azure Portal → Static Web App → Configuration
VITE_OPENAI_API_KEY=your-key-here
VITE_APP_NAME=Kflow Studio
VITE_VERSION=1.0.0
```

## 🌐 **Post-Deployment Features**

### **Automatic CI/CD**
- ✅ Deploys on every push to `main`
- ✅ Preview deployments for PRs
- ✅ Automatic build optimization
- ✅ Global CDN distribution

### **Custom Domain Setup**
```bash
# Add custom domain
az staticwebapp hostname set \
  --name kflow-studio \
  --resource-group kflow-rg \
  --hostname your-domain.com
```

### **SSL Certificate**
- ✅ Automatic SSL certificate provisioning
- ✅ HTTPS redirect enabled by default
- ✅ Certificate auto-renewal

## 📊 **Cost Estimate**

### **Azure Static Web Apps Pricing**
- **Free Tier**: Perfect for Kflow
  - ✅ 100 GB bandwidth/month
  - ✅ 0.5 GB storage
  - ✅ Custom domains
  - ✅ SSL certificates
  - ✅ GitHub integration

- **Standard Tier**: $9/month (if you need more)
  - ✅ 500 GB bandwidth/month
  - ✅ 2 GB storage
  - ✅ SLA guarantee

## 🚀 **Production Optimizations**

### 1. Performance
```json
// packages/studio/vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          reactflow: ['reactflow']
        }
      }
    }
  }
})
```

### 2. SEO & Meta Tags
```html
<!-- packages/studio/index.html -->
<meta name="description" content="Kflow - Human-first workflow language with AI assistance">
<meta name="keywords" content="workflow, BPMN, AI, automation, business process">
<meta property="og:title" content="Kflow Studio">
<meta property="og:description" content="Create workflows in natural language">
```

## 🔒 **Security Configuration**

### Headers & CORS
```json
// staticwebapp.config.json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self' https://api.openai.com"
  }
}
```

## 📈 **Monitoring & Analytics**

### Application Insights Integration
```bash
# Enable Application Insights
az staticwebapp appsettings set \
  --name kflow-studio \
  --setting-names APPINSIGHTS_INSTRUMENTATIONKEY=your-key
```

## 🎯 **Expected Results**

After deployment, you'll have:

- ✅ **Public URL**: `https://kflow-studio.azurestaticapps.net`
- ✅ **Custom Domain**: `https://your-domain.com` (optional)
- ✅ **Global CDN**: Fast loading worldwide
- ✅ **Auto-scaling**: Handles traffic spikes
- ✅ **CI/CD Pipeline**: Automatic deployments
- ✅ **SSL Security**: HTTPS by default
- ✅ **99.9% Uptime**: Azure SLA guarantee

## 🔄 **Alternative Azure Options**

### **Azure App Service**
For more control and server-side features:
```bash
az webapp create \
  --resource-group kflow-rg \
  --plan kflow-plan \
  --name kflow-studio \
  --runtime "NODE|18-lts"
```

### **Azure Container Instances**
For containerized deployment:
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview", "--host"]
```

---

**🚀 Ready to deploy? Choose Option 1 (One-Click Deploy) for the fastest setup!**