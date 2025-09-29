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
   - **Build Presets**: Custom (not React - we use PNPM monorepo)
   - **App location**: `/packages/studio`
   - **Output location**: `dist`

3. Click "Review + Create" → "Create"
4. Azure will provide a deployment token
5. **Important**: Add the deployment token to GitHub Secrets:
   - Go to `https://github.com/WasanthaK/Kflow/settings/secrets/actions`
   - Add secret: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: Copy from Azure Portal → Your Static Web App → "Manage deployment token"

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
   - **Build preset**: Custom (we have our own GitHub Actions workflow)

## 🔧 **Pre-Deployment Checklist**

### 1. Build Verification
```bash
# Test local build (use exact same commands as CI/CD)
cd /workspaces/Kflow
pnpm install --frozen-lockfile
pnpm --filter @kflow/language build
pnpm --filter @kflow/studio build

# Test studio preview
pnpm --filter @kflow/studio preview
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
- ✅ **Custom GitHub Actions workflow** (`.github/workflows/azure-static-web-apps.yml`)
- ✅ **PNPM monorepo support** with sequential package builds
- ✅ Deploys on every push to `main`
- ✅ Preview deployments for PRs
- ✅ Automatic build optimization (ESBuild + manual chunks)
- ✅ Global CDN distribution

**Note**: Don't use Azure's auto-generated workflow - we have a custom one optimized for this monorepo structure.

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
```typescript
// packages/studio/vite.config.ts (already optimized)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          reactflow: ['reactflow']
        }
      }
    },
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020'
  },
  base: './',
  esbuild: {
    drop: ['console', 'debugger'] // Removes console.log in production
  }
});
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

- ✅ **Public URL**: `https://kflow-studio.azurestaticapps.net` (or your chosen name)
- ✅ **Complete Kflow Studio**: Visual workflow editor with AI assistance
- ✅ **BPMN Graph Visualization**: Interactive ReactFlow-powered diagrams  
- ✅ **Natural Language Processing**: StoryFlow → BPMN compilation
- ✅ **Custom Domain**: `https://your-domain.com` (optional)
- ✅ **Global CDN**: Fast loading worldwide (~350KB gzipped bundle)
- ✅ **Auto-scaling**: Handles traffic spikes
- ✅ **CI/CD Pipeline**: Automatic deployments from GitHub
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