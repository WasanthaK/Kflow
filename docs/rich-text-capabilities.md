# 📰 Rich Text Field Capabilities

**Project**: Kflow Dynamic Form Designer  
**Date**: October 14, 2025  
**Feature**: Rich Text Editor Integration

---

## 📑 Table of Contents

### Foundation
- [🎯 Why Rich Text Matters](#-why-rich-text-matters) - 5 key scenarios
- [🎨 Rich Text Field Types](#-rich-text-field-types)
  - WYSIWYG mode
  - Markdown mode
  - Hybrid mode

### Implementation
- [🛠️ Editor Choice: Tiptap](#️-editor-choice-tiptap)
  - Comparison table (Tiptap vs Lexical vs Quill vs Draft.js)
  - Why Tiptap wins
- [💻 Complete Implementation](#-complete-implementation)
  - RichTextEditor React component
  - Toolbar configuration
  - Styling

### Advanced Features
- [👥 @Mentions Integration](#-mentions-integration)
  - User mention extension
  - Azure AD integration
  - Mention dropdown UI
- [🔒 Security Considerations](#-security-considerations)
  - XSS prevention with DOMPurify
  - File upload safety
  - Server-side validation

### AI & Configuration
- [🤖 AI-First Rich Text](#-ai-first-rich-text) - Detection patterns
- [⚙️ Configuration Examples](#️-configuration-examples) - Real-world setups
- [🎨 Styling & Theming](#-styling--theming)

### Usage
- [📊 Performance Optimization](#-performance-optimization)
- [💡 Usage in Comments System](#-usage-in-comments-system) - Reusing for comments
- [🚀 Implementation Roadmap](#-implementation-roadmap) - 4-week plan
- [🔗 Related Documentation](#-related-documentation)

---

## 🎯 Why Rich Text Matters

### Common Workflow Scenarios Requiring Rich Text

1. **Project Requirements**
   - Detailed specifications with formatting
   - Code snippets and examples
   - Tables and lists
   - Images and diagrams

2. **Approval Requests**
   - Formatted business cases
   - Financial justifications with tables
   - Links to supporting documents
   - Highlighted key points

3. **Communication**
   - Announcement drafts
   - Email templates
   - Meeting notes
   - Policy documents

4. **Feedback & Reviews**
   - Performance reviews with structured sections
   - Code review comments with syntax highlighting
   - Design feedback with inline images
   - Customer feedback with formatting

5. **Knowledge Capture**
   - Process documentation
   - Troubleshooting guides
   - Best practices
   - Lessons learned

---

## 🎨 Rich Text Field Types

### 1. Rich Text (WYSIWYG)
**Best for**: Non-technical users, formatted content

```typescript
{
  id: 'project_requirements',
  type: 'richtext',
  label: 'Project Requirements',
  required: true,
  richTextConfig: {
    mode: 'wysiwyg',
    toolbar: {
      show: true,
      position: 'top',
      items: [
        'bold', 'italic', 'underline',
        'heading1', 'heading2', 'heading3',
        'bulletList', 'orderedList',
        'link', 'image', 'table',
        'mention', 'emoji'
      ]
    },
    mentionsEnabled: true,
    mentionSource: {
      type: 'azure-ad',
      filter: { department: 'engineering' }
    },
    maxLength: 10000,
    autoSave: true
  }
}
```

**Renders as:**
```
┌───────────────────────────────────────────────────────┐
│ Project Requirements                                  │
├───────────────────────────────────────────────────────┤
│ [B] [I] [U] │ H1 H2 H3 │ • 1 │ 🔗 📷 📊 │ @ 😊    │ ← Toolbar
├───────────────────────────────────────────────────────┤
│                                                       │
│ # Project Overview                                    │
│                                                       │
│ We need to build a **customer portal** with:         │
│                                                       │
│ 1. User authentication                                │
│ 2. Dashboard with analytics                           │
│ 3. Real-time notifications                            │
│                                                       │
│ cc: @john.smith for backend requirements              │
│                                                       │
│ [See wireframes here](https://...)                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 2. Markdown Mode
**Best for**: Technical users, developers, documentation

```typescript
{
  id: 'technical_documentation',
  type: 'richtext',
  label: 'Technical Documentation',
  required: true,
  richTextConfig: {
    mode: 'markdown',
    toolbar: {
      show: true,
      items: ['bold', 'italic', 'code', 'codeBlock', 'link', 'image']
    },
    maxLength: 50000,
    spellCheck: true
  }
}
```

**Renders as:**
```
┌───────────────────────────────────────────────────────┐
│ Technical Documentation                  [Edit][Preview] │
├───────────────────────────────────────────────────────┤
│ ## API Endpoints                                      │
│                                                       │
│ ### Create User                                       │
│ ```typescript                                         │
│ POST /api/users                                       │
│ {                                                     │
│   "email": "user@example.com",                        │
│   "role": "admin"                                     │
│ }                                                     │
│ ```                                                   │
│                                                       │
│ **Response**: `201 Created`                           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 3. Hybrid Mode
**Best for**: Power users who want both WYSIWYG and Markdown

```typescript
{
  id: 'detailed_feedback',
  type: 'richtext',
  label: 'Detailed Feedback',
  richTextConfig: {
    mode: 'hybrid',  // Can toggle between WYSIWYG and Markdown
    toolbar: {
      show: true,
      position: 'floating'
    }
  }
}
```

---

## 🛠️ Rich Text Editor Options

### Recommended: Tiptap (Modern & Extensible)

**Why Tiptap?**
- ✅ Built on ProseMirror (battle-tested)
- ✅ Headless and customizable
- ✅ TypeScript-first
- ✅ 35KB gzipped (lightweight)
- ✅ Collaborative editing ready
- ✅ Markdown support
- ✅ Excellent React integration

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-mention
```

### Alternative: Lexical (Meta's Editor)

**Why Lexical?**
- ✅ Built by Meta (used in Facebook)
- ✅ Modern architecture
- ✅ TypeScript support
- ✅ Excellent performance
- ⚠️ Steeper learning curve

```bash
pnpm add lexical @lexical/react
```

### Comparison Matrix

| Feature | Tiptap | Lexical | Quill | Draft.js |
|---------|--------|---------|-------|----------|
| **Bundle Size** | 35KB | 45KB | 43KB | 135KB |
| **TypeScript** | ✅ Native | ✅ Native | ⚠️ Basic | ⚠️ Basic |
| **Markdown** | ✅ Native | ✅ Plugin | ❌ No | ⚠️ Complex |
| **@Mentions** | ✅ Extension | ✅ Plugin | ⚠️ Custom | ⚠️ Custom |
| **Collaborative** | ✅ Y.js | ✅ Built-in | ⚠️ Custom | ❌ No |
| **React** | ✅ Excellent | ✅ Native | ✅ Good | ✅ Native |
| **Learning Curve** | Low | Medium | Low | Medium |
| **Maintenance** | ✅ Active | ✅ Active | ⚠️ Slower | ⚠️ Legacy |
| **Recommendation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**Recommendation**: **Tiptap** for best balance of features, size, and developer experience.

---

## 💻 Implementation Example (Tiptap)

### 1. Basic Rich Text Component

```typescript
// packages/studio/src/components/RichTextEditor.tsx

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Mention from '@tiptap/extension-mention';
import { FormField } from '@kflow/language/ir/types';

interface RichTextEditorProps {
  field: FormField & { type: 'richtext' };
  value: string;
  onChange: (value: string) => void;
  onMention?: (query: string) => Promise<MentionResult[]>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  field,
  value,
  onChange,
  onMention,
}) => {
  const config = field.richTextConfig ?? {};
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Table,
      TableRow,
      TableCell,
      TableHeader,
      ...(config.mentionsEnabled
        ? [
            Mention.configure({
              HTMLAttributes: { class: 'mention' },
              suggestion: {
                items: async ({ query }) => {
                  if (onMention) {
                    return await onMention(query);
                  }
                  return [];
                },
              },
            }),
          ]
        : []),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'kflow-rich-text-editor',
        'aria-label': field.label,
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-container">
      {config.toolbar?.show && (
        <RichTextToolbar editor={editor} items={config.toolbar.items} />
      )}
      
      <EditorContent editor={editor} />
      
      {config.maxLength && (
        <div className="character-count">
          {editor.storage.characterCount?.characters() ?? 0} / {config.maxLength}
        </div>
      )}
    </div>
  );
};

// Toolbar Component
interface RichTextToolbarProps {
  editor: any;
  items?: string[];
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editor, items }) => {
  const defaultItems = items ?? [
    'bold', 'italic', 'underline',
    'heading1', 'heading2',
    'bulletList', 'orderedList',
    'link', 'image',
  ];

  return (
    <div className="rich-text-toolbar">
      {defaultItems.includes('bold') && (
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
      )}
      
      {defaultItems.includes('italic') && (
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
      )}
      
      {defaultItems.includes('heading1') && (
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="Heading 1"
        >
          H1
        </button>
      )}
      
      {defaultItems.includes('heading2') && (
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading 2"
        >
          H2
        </button>
      )}
      
      {defaultItems.includes('bulletList') && (
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet List"
        >
          •
        </button>
      )}
      
      {defaultItems.includes('orderedList') && (
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Numbered List"
        >
          1.
        </button>
      )}
      
      {defaultItems.includes('link') && (
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Insert Link"
        >
          🔗
        </button>
      )}
      
      {defaultItems.includes('image') && (
        <button
          onClick={() => {
            const url = window.prompt('Enter image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          title="Insert Image"
        >
          📷
        </button>
      )}
      
      {defaultItems.includes('table') && (
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
          title="Insert Table"
        >
          📊
        </button>
      )}
      
      {defaultItems.includes('code') && (
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
          title="Inline Code"
        >
          <code>&lt;/&gt;</code>
        </button>
      )}
      
      {defaultItems.includes('codeBlock') && (
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="Code Block"
        >
          { }
        </button>
      )}
    </div>
  );
};
```

### 2. Integration with User Mentions

```typescript
// packages/studio/src/components/UserMentionExtension.tsx

import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { MentionList } from './MentionList';

export const createUserMentionSuggestion = (
  fetchUsers: (query: string) => Promise<User[]>
) => ({
  items: async ({ query }: { query: string }) => {
    const users = await fetchUsers(query);
    return users.slice(0, 5); // Limit to 5 suggestions
  },

  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
});

// MentionList Component
export const MentionList = React.forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.email, label: item.name });
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  return (
    <div className="mention-list">
      {props.items.map((item: User, index: number) => (
        <button
          key={item.email}
          className={index === selectedIndex ? 'selected' : ''}
          onClick={() => selectItem(index)}
        >
          <img src={item.avatar} alt={item.name} className="avatar" />
          <div>
            <div className="name">{item.name}</div>
            <div className="email">{item.email}</div>
          </div>
        </button>
      ))}
    </div>
  );
});
```

### 3. Styling

```css
/* packages/studio/src/components/RichTextEditor.css */

.rich-text-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.rich-text-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px 8px 0 0;
}

.rich-text-toolbar button {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.rich-text-toolbar button:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.rich-text-toolbar button.is-active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.kflow-rich-text-editor {
  min-height: 200px;
  padding: 16px;
  outline: none;
}

.kflow-rich-text-editor:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Content Styles */
.kflow-rich-text-editor h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 0.5em 0;
}

.kflow-rich-text-editor h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.5em 0;
}

.kflow-rich-text-editor h3 {
  font-size: 1.25em;
  font-weight: bold;
  margin: 0.5em 0;
}

.kflow-rich-text-editor ul,
.kflow-rich-text-editor ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.kflow-rich-text-editor code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.kflow-rich-text-editor pre {
  background: #1e293b;
  color: #f1f5f9;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
}

.kflow-rich-text-editor blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  margin: 1em 0;
  color: #64748b;
  font-style: italic;
}

.kflow-rich-text-editor table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.kflow-rich-text-editor th,
.kflow-rich-text-editor td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.kflow-rich-text-editor th {
  background: #f8fafc;
  font-weight: bold;
}

.kflow-rich-text-editor img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
}

/* Mention Styles */
.mention {
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}

.mention:hover {
  background: #dbeafe;
}

.mention-list {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.mention-list button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border: none;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
}

.mention-list button:hover,
.mention-list button.selected {
  background: #f1f5f9;
}

.mention-list .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.mention-list .name {
  font-weight: 500;
  color: #1e293b;
}

.mention-list .email {
  font-size: 0.875em;
  color: #64748b;
}

/* Character Count */
.character-count {
  padding: 8px 16px;
  text-align: right;
  font-size: 0.875em;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
}
```

---

## 🎯 AI-First Rich Text Generation

### Enhanced AI Prompt for Rich Text

```typescript
const RICH_TEXT_AWARE_SYSTEM_PROMPT = `You are an expert form designer.

When generating forms, detect when rich text is appropriate:

RICH TEXT INDICATORS:
- "detailed description" → richtext
- "formatted content" → richtext
- "project requirements" → richtext
- "announcement" → richtext
- "documentation" → richtext with markdown mode
- "technical specification" → richtext with code support
- "feedback" (detailed) → richtext
- "message body" → richtext with mentions
- "content" → richtext

RICH TEXT CONFIGURATION:
- Enable @mentions for collaborative fields
- Use markdown mode for technical content
- Enable tables for structured data
- Add code blocks for technical specs
- Set appropriate maxLength (5000-50000)

EXAMPLE OUTPUT:
{
  "id": "project_requirements",
  "type": "richtext",
  "label": "Project Requirements",
  "placeholder": "Describe the project in detail...",
  "required": true,
  "richTextConfig": {
    "mode": "wysiwyg",
    "toolbar": {
      "show": true,
      "items": ["bold", "italic", "heading1", "heading2", "bulletList", "orderedList", "link", "table", "mention"]
    },
    "mentionsEnabled": true,
    "maxLength": 10000,
    "autoSave": true
  }
}
`;
```

### Example: AI Generates Rich Text Form

**Input**:
```kflow
Ask product manager for detailed project requirements with technical specifications
```

**AI Output**:
```json
{
  "id": "project_requirements_form",
  "title": "Project Requirements Submission",
  "fields": [
    {
      "id": "project_name",
      "type": "text",
      "label": "Project Name",
      "required": true
    },
    {
      "id": "project_requirements",
      "type": "richtext",
      "label": "Detailed Requirements",
      "placeholder": "Describe project goals, features, and acceptance criteria...",
      "required": true,
      "richTextConfig": {
        "mode": "wysiwyg",
        "toolbar": {
          "show": true,
          "items": [
            "bold", "italic", "underline",
            "heading1", "heading2", "heading3",
            "bulletList", "orderedList",
            "link", "image", "table",
            "blockquote", "mention"
          ]
        },
        "mentionsEnabled": true,
        "mentionSource": {
          "type": "azure-ad",
          "filter": { "department": "engineering" }
        },
        "maxLength": 20000,
        "autoSave": true,
        "spellCheck": true
      }
    },
    {
      "id": "technical_specifications",
      "type": "richtext",
      "label": "Technical Specifications",
      "placeholder": "Add technical details, architecture diagrams, API specs...",
      "required": true,
      "richTextConfig": {
        "mode": "markdown",
        "toolbar": {
          "show": true,
          "items": [
            "bold", "italic",
            "heading1", "heading2",
            "bulletList", "orderedList",
            "code", "codeBlock",
            "link", "image", "table"
          ]
        },
        "maxLength": 50000
      }
    },
    {
      "id": "stakeholders",
      "type": "usergroup",
      "label": "Stakeholders to Notify",
      "userSource": {
        "type": "azure-ad",
        "includeGroups": true
      }
    }
  ]
}
```

---

## 📊 Use Case Examples

### Use Case 1: Product Requirements Document

```typescript
{
  id: 'prd_content',
  type: 'richtext',
  label: 'Product Requirements Document',
  richTextConfig: {
    mode: 'wysiwyg',
    toolbar: {
      items: [
        'heading1', 'heading2', 'heading3',
        'bold', 'italic',
        'bulletList', 'orderedList',
        'table', 'link', 'image',
        'mention'
      ]
    },
    mentionsEnabled: true,
    templatesEnabled: true,  // Pre-filled PRD templates
    maxLength: 50000
  }
}
```

### Use Case 2: Code Review Comments

```typescript
{
  id: 'review_comments',
  type: 'richtext',
  label: 'Code Review Feedback',
  richTextConfig: {
    mode: 'markdown',
    toolbar: {
      items: ['code', 'codeBlock', 'bold', 'italic', 'link', 'mention']
    },
    mentionsEnabled: true,
    mentionSource: {
      type: 'api',
      endpoint: '/api/developers'
    }
  }
}
```

### Use Case 3: Customer Announcement

```typescript
{
  id: 'announcement_body',
  type: 'richtext',
  label: 'Announcement Content',
  richTextConfig: {
    mode: 'wysiwyg',
    toolbar: {
      items: [
        'heading1', 'heading2',
        'bold', 'italic', 'underline',
        'bulletList',
        'link', 'image'
      ]
    },
    maxLength: 5000,
    spellCheck: true,
    autoSave: true
  }
}
```

---

## 🔒 Security Considerations

### XSS Prevention

```typescript
import DOMPurify from 'dompurify';

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 's',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre',
      'span'  // For mentions
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',  // Links
      'src', 'alt', 'width', 'height',  // Images
      'class', 'data-mention', 'data-id'  // Mentions
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
  });
}
```

### File Upload Safety (for image insertion)

```typescript
export const validateImageUpload = (file: File): ValidationResult => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images allowed' };
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 5MB' };
  }
  
  return { valid: true };
};
```

---

## 📈 Performance Optimization

### Lazy Loading

```typescript
// Lazy load rich text editor
const RichTextEditor = React.lazy(() => import('./RichTextEditor'));

// In form renderer
{field.type === 'richtext' && (
  <Suspense fallback={<LoadingSpinner />}>
    <RichTextEditor field={field} value={value} onChange={onChange} />
  </Suspense>
)}
```

### Auto-save with Debouncing

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSave = useDebouncedCallback(
  (content: string) => {
    // Save to backend or local storage
    saveFormDraft(formId, { [field.id]: content });
  },
  1000  // 1 second delay
);

// In editor onChange
onUpdate: ({ editor }) => {
  const html = editor.getHTML();
  onChange(html);
  if (config.autoSave) {
    debouncedSave(html);
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Basic Rich Text (Week 1)
- [ ] Install Tiptap
- [ ] Create basic RichTextEditor component
- [ ] Add to FormRenderer
- [ ] Style toolbar and content

### Phase 2: Toolbar & Formatting (Week 1-2)
- [ ] Complete toolbar implementation
- [ ] Add all formatting options
- [ ] Keyboard shortcuts
- [ ] Accessibility

### Phase 3: @Mentions (Week 2)
- [ ] User mention extension
- [ ] Azure AD integration
- [ ] Mention dropdown UI
- [ ] Mention rendering

### Phase 4: Advanced Features (Week 3)
- [ ] Image upload
- [ ] Table support
- [ ] Code blocks with syntax highlighting
- [ ] Markdown mode
- [ ] Auto-save

### Phase 5: AI Integration (Week 3-4)
- [ ] Update AI prompts to detect rich text needs
- [ ] Configure rich text based on context
- [ ] Test AI-generated rich text forms

---

## 📚 Resources

- **Tiptap**: https://tiptap.dev/
- **ProseMirror**: https://prosemirror.net/
- **DOMPurify**: https://github.com/cure53/DOMPurify
- **Markdown Guide**: https://www.markdownguide.org/

---

## 🔗 Related Documentation

- **[form-audit-and-comments.md](./form-audit-and-comments.md)** - Reuse RichTextEditor component for collaborative comments with @mentions
- **[section-visibility-guide.md](./section-visibility-guide.md)** - Permission system for controlling rich text field visibility
- **[form-designer-brainstorm.md](./form-designer-brainstorm.md)** - Complete IR type system including RichTextConfig

---

## 💡 Usage in Comments System

The RichTextEditor component designed for form fields can be reused in the comments system ([form-audit-and-comments.md](./form-audit-and-comments.md)):

```typescript
// Reuse in CommentThread component
<RichTextEditor
  value={newComment}
  onChange={setNewComment}
  config={{
    mode: 'wysiwyg',
    toolbar: { show: true, items: ['bold', 'italic', 'link', 'mention'] },
    mentionsEnabled: true,
    mentionSource: { type: 'azure-ad' },
    maxLength: 5000
  }}
/>
```

**Key Considerations for Comments**:
- Enable DOMPurify sanitization server-side
- Apply same @mention permissions as form fields
- Consider limiting formatting options for readability
- Auto-save comment drafts to prevent data loss

---

*Rich text: Because sometimes plain text just isn't enough! 📰*
