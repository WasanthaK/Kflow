# 🔄 Kflow - Human-First Workflow Language

**A revolutionary workflow language that bridges business and technical teams through natural language, visual graphs, and AI assistance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/WasanthaK/Kflow)
[![BPMN 2.0](https://img.shields.io/badge/BPMN-2.0%20Compliant-green.svg)](https://www.bpmn.org/)

## ✨ **What Makes Kflow Special**

- **🧠 Human-First Design**: Write workflows in natural language that everyone understands
- **🤖 AI-Powered**: Intelligent autocomplete with OpenAI integration
- **📊 Visual Graphs**: Interactive BPMN-compliant workflow diagrams  
- **🎯 BPMN 2.0 Ready**: Industry-standard business process notation
- **⚡ Real-time**: See your workflow graph update as you type
- **🔧 Production Ready**: Complete toolchain with compiler and studio

## 📖 **Quick Example**

```kflow
Flow: Order Processing System

Ask customer for {order_details} and {payment_method}
Do: validate customer information using verification service
Do: calculate order total with taxes and shipping

If {order_total} > 1000
  Ask manager to approve high-value order
  If manager_approved
    Do: process payment using secure gateway
    Send confirmation email to customer: "Order approved"
  Otherwise
    Send rejection email: "Requires manager approval"
    Stop
Otherwise
  Do: process standard payment automatically

Send tracking notification to customer
Wait for shipping confirmation
Stop
```

**↓ Compiles to BPMN-compliant SimpleScript with:**
- ✅ 6+ Task types (User, Service, Script, Message, etc.)
- ✅ Variable extraction and templating
- ✅ Actor and system recognition  
- ✅ Branch labeling and flow control
- ✅ Interactive visual graph

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/WasanthaK/Kflow.git
cd Kflow

# Install dependencies
pnpm install

# Build all packages
pnpm -w -r build

# Start the development studio
pnpm --filter studio dev
```

Visit `http://localhost:5173` to access Kflow Studio.

## 📦 **Packages**

### `packages/language`
Core Kflow compiler and language features:
- **StoryFlow Parser**: Natural language to AST conversion
- **BPMN Compiler**: Industry-standard workflow compilation
- **AI Autocomplete**: OpenAI-powered intelligent suggestions
- **Variable Extraction**: Smart template and actor recognition
- **Type System**: Full TypeScript support

### `packages/studio` 
Visual workflow editor and development environment:
- **Interactive Editor**: Real-time StoryFlow editing
- **Visual Graphs**: ReactFlow-powered BPMN diagrams
- **AI Integration**: Tab-triggered intelligent autocomplete
- **Fullscreen Mode**: Dedicated workflow visualization
- **Export Tools**: Multiple output formats

### `packages/vscode-ext`
VS Code extension for professional development:
- **Syntax Highlighting**: StoryFlow language support
- **Error Detection**: Real-time validation and linting
- **Quick Fixes**: Automated error correction
- **IntelliSense**: Smart completions and suggestions

## 🎯 **Core Features**

### 🔤 **Language Features**
- **Natural Language Syntax**: Write workflows like you speak
- **Template Variables**: `{order_id}`, `{customer_data}`, `{payment_amount}`  
- **Smart Actor Detection**: Automatically identifies managers, customers, systems
- **BPMN Task Types**: User, Service, Script, Business Rule, Message, Wait tasks
- **Complex Branching**: Nested If/Otherwise with proper flow control
- **Domain Recognition**: HR, E-commerce, Support, Financial workflow patterns

### 🤖 **AI Integration** 
- **OpenAI Powered**: GPT-4 driven intelligent suggestions
- **Context Aware**: Domain-specific workflow recommendations
- **Fallback Logic**: Rule-based suggestions when AI unavailable
- **Privacy First**: API keys stored locally, never transmitted
- **Press Tab**: Get instant AI suggestions anywhere in your workflow

### 📊 **Visual Studio**
- **Interactive Graphs**: ReactFlow-powered BPMN diagrams
- **Real-time Updates**: Graph changes as you type
- **Fullscreen Mode**: Dedicated view for complex workflows
- **BPMN Compliance**: Proper shapes, colors, and flow patterns
- **Export Ready**: Production-ready visual documentation

## 📚 **Documentation**

- **[Complete Language Guide](./KflowLanguage.md)** - Full specification with examples
- **[Examples](./examples/)** - Sample workflows for different domains
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute

## 🏆 **Production Ready**

### **Enterprise Features**
- **BPMN 2.0 Compliance**: Industry standard notation
- **Type Safety**: Full TypeScript implementation
- **Extensible Architecture**: Plugin system for custom needs
- **Performance Optimized**: Fast compilation and rendering
- **Security First**: No data transmission, local processing

### **Quality Assurance**
- ✅ Comprehensive functionality
- ✅ Type-safe throughout
- ✅ Production builds optimized
- ✅ Cross-browser compatibility
- ✅ Responsive design
- ✅ Visual workflow validation

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### **Development Setup**
```bash
git clone https://github.com/WasanthaK/Kflow.git
cd Kflow
pnpm install
pnpm -w -r build
pnpm --filter studio dev
```

## 📄 **License**

This project is licensed under the Apache-2.0 License - see the [LICENSE](./LICENSE) file for details.

## 🙏 **Acknowledgments**

- **ReactFlow** - Excellent graph visualization library
- **OpenAI** - Powering intelligent autocomplete  
- **BPMN.org** - Business process modeling standards
- **Vite** - Lightning-fast build tooling
- **TypeScript** - Type-safe development experience

---

**Made with ❤️ for the workflow automation community**

*Kflow - Making workflow creation accessible to everyone, from business analysts to developers.*
