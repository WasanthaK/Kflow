# 🚀 Kflow Azure Deployment Guide

**Deploy your production-ready Kflow Studio to Azure Static Web Apps with automated CI/CD.**

## 📋 Prerequisites

- Azure subscription
- GitHub repository (already set up)
- Production-ready Kflow codebase ✅

## 🎯 Step-by-Step Azure Deployment

### 1. **Create Azure Static Web App**

#### Option A: Azure Portal (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"Static Web App"**
4. Click **"Create"**

**Configuration:**
```
Resource Group: kflow-production
Static Web App Name: kflow-studio
Plan Type: Free (or Standard for custom domain)
Region: East US 2 (or closest to your users)

Deployment Details:
Source: GitHub
Organization: WasanthaK
Repository: Kflow
Branch: main
Build Presets: Custom

Build Details:
App Location: /packages/studio
API Location: (leave empty)
Output Location: dist
```

#### Option B: Azure CLI
```bash
# Install Azure CLI and login
az login

# Create resource group
az group create --name kflow-production --location eastus2

# Create static web app
az staticwebapp create \
  --name kflow-studio \
  --resource-group kflow-production \
  --source https://github.com/WasanthaK/Kflow \
  --location eastus2 \
  --branch main \
  --app-location "/packages/studio" \
  --output-location "dist" \
  --login-with-github
```

### 2. **Configure GitHub Secrets**

After creating the Static Web App, Azure will automatically:
- Add the workflow file (already present)
- Create a deployment token

**Manually add the secret:**
1. Go to your GitHub repository: `https://github.com/WasanthaK/Kflow`
2. Click **Settings** → **Actions** → **Secrets and variables**
3. Click **"New repository secret"**
4. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
5. Value: Copy from Azure Portal → Static Web App → **"Manage deployment token"**

### 3. **Deploy Automatically**

The deployment is now automated! Every push to `main` will:

```yaml
✅ Install dependencies with PNPM
✅ Build @kflow/language package  
✅ Build @kflow/studio production bundle
✅ Deploy to Azure Static Web Apps
✅ Provide global CDN distribution
✅ Enable custom domains (if configured)
```

### 4. **Access Your Deployed Kflow Studio**

After deployment completes (2-5 minutes):

1. **Default URL**: `https://kflow-studio.azurestaticapps.net`
2. **Custom Domain**: Configure in Azure Portal if needed
3. **HTTPS**: Automatically enabled with SSL certificate

## 🔧 Build Configuration

Our optimized production build includes:

### **Vite Configuration** (`packages/studio/vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
});
```

### **Production Optimizations**
- ⚡ **ESBuild minification** for faster builds
- 📦 **Code splitting** for optimal loading
- 🗜️ **Gzip compression** via Azure CDN
- 🌐 **Global CDN** for worldwide performance
- 📱 **Responsive design** for all devices

## 🎯 Deployment Features

### **Automatic Deployments**
- ✅ **Push to Deploy**: Every push to `main` triggers deployment  
- ✅ **Preview Deployments**: Pull requests get preview URLs
- ✅ **Rollback Support**: Easy rollback to previous versions
- ✅ **Build Logs**: Detailed deployment logs in Azure

### **Production Features**
- 🌍 **Global CDN**: Fast loading worldwide
- 🔒 **HTTPS**: Automatic SSL certificates
- 📊 **Analytics**: Built-in Azure Application Insights
- 🎯 **Custom Domains**: Add your own domain
- ⚡ **SPA Routing**: Single-page app routing support

## 🔍 Monitoring & Analytics

### **Azure Application Insights** (Optional)
1. Create Application Insights resource
2. Add connection string to Static Web App
3. Monitor performance, errors, and usage

### **Custom Analytics**
Add to `packages/studio/index.html`:
```html
<!-- Google Analytics, Mixpanel, etc. -->
```

## 🛠️ Troubleshooting

### **Common Issues:**

#### Build Fails
```bash
# Check locally first
cd /workspaces/Kflow
pnpm install
pnpm --filter @kflow/language build
pnpm --filter @kflow/studio build
```

#### Deployment Token Issues
1. Go to Azure Portal → Static Web App
2. Click **"Manage deployment token"**  
3. **"Reset token"** and update GitHub secret

#### Custom Domain Setup
1. Azure Portal → Static Web App → **"Custom domains"**
2. Add domain and validate ownership
3. Configure DNS CNAME record

### **Support Resources:**
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Kflow Issues](https://github.com/WasanthaK/Kflow/issues)

## 📈 Performance Metrics

**Expected Performance:**
- ⚡ **Build Time**: 2-3 minutes
- 🌐 **Global Load Time**: < 2 seconds
- 📦 **Bundle Size**: ~350KB gzipped
- 🎯 **Lighthouse Score**: 95+ performance

## 🎉 Go Live Checklist

- [ ] Azure Static Web App created
- [ ] GitHub secret configured
- [ ] Workflow file committed
- [ ] Build passes locally
- [ ] First deployment successful
- [ ] Custom domain configured (optional)
- [ ] Analytics configured (optional)
- [ ] SSL certificate active
- [ ] All features tested in production

## 🚀 **Your Kflow Studio is now live on Azure!**

**Production URL**: `https://kflow-studio.azurestaticapps.net`

### **What's Deployed:**
- 🔄 **Complete Kflow Studio** with visual workflow editor
- 🤖 **AI-powered autocomplete** (users provide their own OpenAI API key)
- 📊 **Interactive BPMN graphs** with all 5 gateway types
- 🎨 **Professional UI** with fullscreen mode
- 🔧 **Production optimizations** for performance

### **Next Steps:**
1. Share the URL with your team
2. Create workflows and test all features
3. Configure custom domain if needed
4. Monitor performance and usage
5. Scale up Azure plan if needed

**Enterprise-ready workflow platform, deployed and accessible globally!** 🌍