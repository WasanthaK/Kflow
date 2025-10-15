# 🎯 Kflow Dynamic Form Designer - Master Implementation Plan

**Project**: Kflow Dynamic Form Designer  
**Start Date**: October 14, 2025  
**Duration**: 10 weeks (adjustable based on priorities)  
**Status**: 📋 Planning Phase

---

## 📊 Progress Overview

**Overall Progress**: 0% (0/68 tasks completed)

| Phase | Status | Progress | Duration | Priority |
|-------|--------|----------|----------|----------|
| Phase 1: Foundation | 🔴 Not Started | 0/12 | Week 1-2 | 🔥 Critical |
| Phase 2: AI Generation | 🔴 Not Started | 0/8 | Week 2-3 | 🔥 Critical |
| Phase 3: User Fields | 🔴 Not Started | 0/10 | Week 3-4 | ⭐ High |
| Phase 4: Rich Text | 🔴 Not Started | 0/8 | Week 4-5 | ⭐ High |
| Phase 5: Section Visibility | 🔴 Not Started | 0/10 | Week 5-6 | ⭐ High |
| Phase 6: Repeatable Sections | 🔴 Not Started | 0/8 | Week 6-7 | ⭐ High |
| Phase 7: Audit & Comments | 🔴 Not Started | 0/9 | Week 7-8 | ⭐ High |
| Phase 8: Polish & Testing | 🔴 Not Started | 0/3 | Week 9-10 | ✅ Medium |

---

## 📑 Phase 1: Foundation (Week 1-2) 🔥 CRITICAL

**Goal**: Basic form inference and rendering working end-to-end

**Documentation**: `docs/form-designer-quickstart.md`, `docs/form-designer-brainstorm.md`

### Task 1.1: Extend IR Type System
**Status**: ✅ COMPLETED (Oct 14, 2025)  
**Assignee**: GitHub Copilot  
**Estimated Time**: 2 hours  
**Actual Time**: 30 minutes  
**Files Modified**:
- [x] `packages/language/src/ir/types.ts` - Added 18 form field types, validation rules, and configurations
- [x] `packages/language/src/__tests__/form-types.test.ts` - Created comprehensive test suite

**Checklist**:
- [x] Add `FormField` type with 18 field types (text, number, email, date, select, textarea, user, usergroup, richtext, repeatable, etc.)
- [x] Add `FormDefinition` type
- [x] Add `FormValidation` type
- [x] Add `ValidationRule` type (8 validation types)
- [x] Add `SelectOption` type
- [x] Add `UserSourceConfig`, `RichTextConfig`, `RepeatableConfig` types
- [x] Update `IRState` userTask to include optional `form?: FormDefinition`
- [x] Run TypeScript compilation (✅ no errors)
- [x] Write unit tests for new types (✅ 9 tests passed)

**Reference**: `docs/form-designer-brainstorm.md` → "Extended IR Type System"

---

### Task 1.2: Create Form Inference Engine
**Status**: ✅ COMPLETED (Oct 14, 2025)  
**Assignee**: GitHub Copilot  
**Estimated Time**: 3 hours  
**Actual Time**: 45 minutes  
**Files Created**:
- [x] `packages/language/src/storyflow/formInference.ts` - Complete inference engine with 295 lines
- [x] `packages/language/src/__tests__/form-inference.test.ts` - 29 comprehensive tests

**Checklist**:
- [x] Implement `inferFormFromPrompt(prompt: string, taskId: string): FormDefinition`
- [x] Implement `inferFieldType(varName: string): FormField['type']`
- [x] Implement `extractVariables(prompt: string): string[]`
- [x] Implement `inferFieldFromVariable(varName: string, fieldId: string): FormField`
- [x] Add field type detection rules (9 types detected):
  - [x] email detection
  - [x] number detection (age, amount, count, price, cost, quantity)
  - [x] date detection
  - [x] time detection
  - [x] datetime detection
  - [x] textarea detection (notes, description, comments, message, reason, justification)
  - [x] select detection (status, type, category, department, priority)
  - [x] checkbox detection (agree, accept, consent, is*, has*)
  - [x] text (default)
- [x] Extract {variable} patterns from prompt with regex
- [x] Generate form ID and title automatically
- [x] Set required fields by default with custom messages
- [x] Add type-specific validation (email pattern, number min/max, etc.)
- [x] Add smart option inference for select fields (status, priority, department)
- [x] Write unit tests (✅ 29 tests passed covering all scenarios)

**Reference**: `docs/form-designer-quickstart.md` → "Step 2: Create Form Inference"

---

### Task 1.3: Integrate Form Inference into Compiler
**Status**: ✅ COMPLETED (Oct 14, 2025)  
**Assignee**: GitHub Copilot  
**Estimated Time**: 1 hour  
**Actual Time**: 30 minutes  
**Files Modified**:
- [x] `packages/language/src/storyflow/compile.ts` - Added form inference import and integration
- [x] `packages/language/src/__tests__/storyflow-form-integration.test.ts` - 7 comprehensive integration tests

**Checklist**:
- [x] Import `inferFormFromPrompt` from formInference module
- [x] Add form inference when generating userTask states (calls inferFormFromPrompt with prompt and task ID)
- [x] Attach form to IRState.userTask.form only if fields are generated
- [x] Preserve existing assignee logic (assignee still passed through)
- [x] Run existing compiler tests (✅ all still pass)
- [x] Add new integration tests (✅ 7/7 tests passed):
  - Forms generated for userTasks with variables
  - No forms for tasks without variables
  - Mixed field types detected correctly
  - Select fields with auto-generated options
  - Assignee preserved when form attached
  - Unique form IDs per task
  - Age fields get special min/max validation

**Reference**: `docs/form-designer-quickstart.md` → "Step 3: Update StoryFlow Compiler"

---

### Task 1.4: Create Basic Form Renderer Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Create functional React component
- [ ] Accept `form: FormDefinition` prop
- [ ] Render form title and description
- [ ] Render all field types:
  - [ ] text input
  - [ ] number input
  - [ ] email input
  - [ ] date input
  - [ ] textarea
  - [ ] select dropdown
- [ ] Add form state management (useState or React Hook Form)
- [ ] Handle form submission
- [ ] Add basic styling (CSS or Tailwind)
- [ ] Add required field indicators (*)
- [ ] Write component tests

**Reference**: `docs/form-designer-quickstart.md` → "Step 4: Create Simple Form Renderer"

---

### Task 1.5: Add Form Validation
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Create/Modify**:
- [ ] `packages/studio/src/components/forms/validation.ts`
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Implement validation rules:
  - [ ] Required validation
  - [ ] Email pattern validation
  - [ ] Min/max number validation
  - [ ] Date validation
- [ ] Show validation errors inline
- [ ] Prevent submission if validation fails
- [ ] Add error styling
- [ ] Write validation tests

---

### Task 1.6: Integration Test - End to End
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  

**Checklist**:
- [ ] Create test workflow: "Ask employee for {name} and {email}"
- [ ] Compile StoryFlow to IR
- [ ] Verify form is generated in IR
- [ ] Render form in Studio
- [ ] Fill out form
- [ ] Submit and capture data
- [ ] Verify data structure
- [ ] Document test results

---

### Task 1.7: Documentation - Basic Setup
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  

**Checklist**:
- [ ] Create `packages/language/README-forms.md`
- [ ] Document form inference usage
- [ ] Add code examples
- [ ] Update main README with form feature
- [ ] Add troubleshooting section

---

## 📑 Phase 2: AI Generation (Week 2-3) 🔥 CRITICAL

**Goal**: AI-powered form generation from natural language

**Documentation**: `docs/ai-first-form-design.md`

### Task 2.1: Setup OpenAI Integration
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Create**:
- [ ] `packages/language/src/ai/openaiClient.ts`

**Checklist**:
- [ ] Install `openai` npm package
- [ ] Create OpenAI client wrapper
- [ ] Add environment variable for API key (OPENAI_API_KEY)
- [ ] Implement error handling
- [ ] Add retry logic
- [ ] Add request timeout
- [ ] Write integration tests (with mock)

---

### Task 2.2: Implement System Prompt
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 30 minutes  
**Files to Create**:
- [ ] `packages/language/src/ai/prompts.ts`

**Checklist**:
- [ ] Copy `FORM_GENERATION_SYSTEM_PROMPT` from docs
- [ ] Add prompt template helpers
- [ ] Add context injection helpers
- [ ] Export as constant

**Reference**: `docs/ai-first-form-design.md` → "System Prompt (The Secret Sauce)"

---

### Task 2.3: Create AI Form Generator
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  
**Files to Create**:
- [ ] `packages/language/src/ai/formGenerator.ts`

**Checklist**:
- [ ] Implement `generateFormWithAI(prompt, context): Promise<FormDefinition>`
- [ ] Build user prompt from StoryFlow task
- [ ] Include workflow context
- [ ] Include organization schema (if available)
- [ ] Call OpenAI API with system + user prompt
- [ ] Parse JSON response
- [ ] Validate generated form
- [ ] Add fallback to basic inference on failure
- [ ] Add telemetry/logging
- [ ] Write unit tests with mocked API

**Reference**: `docs/ai-first-form-design.md` → "AI Form Generation Pipeline"

---

### Task 2.4: Update Compiler to Use AI
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/storyflow/compile.ts`

**Checklist**:
- [ ] Add configuration flag: `useAIFormGeneration: boolean`
- [ ] If enabled, call `generateFormWithAI()`
- [ ] If disabled or fails, fallback to `inferFormFromPrompt()`
- [ ] Update tests
- [ ] Add configuration documentation

---

### Task 2.5: Test AI Generation
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  

**Checklist**:
- [ ] Test: "Ask manager to approve vacation"
- [ ] Verify user field is generated for "manager"
- [ ] Verify date fields with validation
- [ ] Test: "Ask employee for expense details and forward to finance if over $1000"
- [ ] Verify conditional field logic
- [ ] Test: "Ask for project requirements"
- [ ] Verify rich text or textarea field
- [ ] Document AI accuracy metrics

**Reference**: `docs/ai-first-form-design.md` → "Example Conversations"

---

### Task 2.6: Add AI Cost Tracking
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Create**:
- [ ] `packages/language/src/ai/telemetry.ts`

**Checklist**:
- [ ] Track API calls
- [ ] Track tokens used
- [ ] Estimate costs
- [ ] Log generation time
- [ ] Add metrics dashboard (optional)

**Reference**: `docs/ai-first-form-design.md` → "AI-first design philosophy"

---

## 📑 Phase 3: User Fields & Dynamic Forwarding (Week 3-4) ⭐ HIGH

**Goal**: User/usergroup field types for dynamic routing

**Documentation**: `docs/ai-first-form-design.md` (Dynamic Forwarding section)

### Task 3.1: Extend IR with User Field Types
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/ir/types.ts`

**Checklist**:
- [ ] Add 'user', 'usergroup', 'role' to FormField type union
- [ ] Add `UserSourceConfig` interface
- [ ] Update FormField with `userSource?: UserSourceConfig`
- [ ] Add types for Azure AD, Okta, LDAP sources
- [ ] Run TypeScript compilation
- [ ] Update type tests

**Reference**: `docs/form-designer-brainstorm.md` → "User/Group Field Configuration"

---

### Task 3.2: Update AI Prompt for User Detection
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 30 minutes  
**Files to Modify**:
- [ ] `packages/language/src/ai/prompts.ts`

**Checklist**:
- [ ] Verify "Dynamic Forwarding Detection" section is included
- [ ] Test detection of: "manager", "approver", "reviewer" → user field
- [ ] Test detection of: "team", "group", "department" → usergroup field
- [ ] Update tests

**Reference**: Already updated in `docs/ai-first-form-design.md`

---

### Task 3.3: Create User Picker Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/UserPicker.tsx`

**Checklist**:
- [ ] Create searchable dropdown component
- [ ] Add user search functionality
- [ ] Show user name, email, role
- [ ] Add user avatar (optional)
- [ ] Support single and multi-select
- [ ] Add keyboard navigation
- [ ] Add loading states
- [ ] Style component
- [ ] Write component tests

---

### Task 3.4: Create UserGroup Picker Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/UserGroupPicker.tsx`

**Checklist**:
- [ ] Create group selection dropdown
- [ ] Show group name and member count
- [ ] Add search functionality
- [ ] Support multi-select
- [ ] Show group hierarchy (if applicable)
- [ ] Style component
- [ ] Write component tests

---

### Task 3.5: Create User Source Service (Azure AD)
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/studio/src/services/userSource/azureAD.ts`
- [ ] `packages/studio/src/services/userSource/types.ts`

**Checklist**:
- [ ] Create user source interface
- [ ] Implement Azure AD user search
- [ ] Implement Azure AD group search
- [ ] Add role filtering
- [ ] Add department filtering
- [ ] Add caching layer
- [ ] Handle authentication
- [ ] Write integration tests
- [ ] Add error handling

---

### Task 3.6: Integrate User Fields in Form Renderer
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Modify**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Detect user/usergroup field types
- [ ] Render UserPicker for 'user' type
- [ ] Render UserGroupPicker for 'usergroup' type
- [ ] Pass userSource configuration
- [ ] Handle field value changes
- [ ] Update form data structure
- [ ] Test with dynamic routing workflow

---

### Task 3.7: Test Dynamic Routing
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  

**Checklist**:
- [ ] Create workflow: "Ask employee for vacation and {manager}"
- [ ] Generate form with AI
- [ ] Verify user field is created
- [ ] Select manager from dropdown
- [ ] Submit form
- [ ] Verify workflow routes to selected manager
- [ ] Document dynamic routing pattern

---

## 📑 Phase 4: Rich Text Editor (Week 4-5) ⭐ HIGH

**Goal**: Rich text fields with @mentions

**Documentation**: `docs/rich-text-capabilities.md`

### Task 4.1: Install Tiptap Dependencies
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 30 minutes  

**Checklist**:
- [ ] Install @tiptap/react
- [ ] Install @tiptap/starter-kit
- [ ] Install @tiptap/extension-mention
- [ ] Install @tiptap/extension-link
- [ ] Install @tiptap/extension-image
- [ ] Install @tiptap/extension-table
- [ ] Update package.json
- [ ] Run npm install

**Reference**: `docs/rich-text-capabilities.md` → "Editor Choice: Tiptap"

---

### Task 4.2: Extend IR with Rich Text Types
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/ir/types.ts`

**Checklist**:
- [ ] Add 'richtext', 'markdown' to FormField type union
- [ ] Add `RichTextConfig` interface
- [ ] Add toolbar configuration types
- [ ] Add mention configuration
- [ ] Run TypeScript compilation

**Reference**: `docs/form-designer-brainstorm.md` → "RichTextConfig"

---

### Task 4.3: Create RichTextEditor Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 6 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/RichTextEditor.tsx`

**Checklist**:
- [ ] Create Tiptap editor wrapper
- [ ] Implement toolbar (bold, italic, underline, etc.)
- [ ] Add heading support (H1, H2, H3)
- [ ] Add list support (bullet, ordered)
- [ ] Add link insertion
- [ ] Add image upload
- [ ] Add table support
- [ ] Add code blocks
- [ ] Style editor and toolbar
- [ ] Add keyboard shortcuts
- [ ] Write component tests

**Reference**: `docs/rich-text-capabilities.md` → "Complete Implementation"

---

### Task 4.4: Add @Mentions Extension
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/extensions/mentions.ts`

**Checklist**:
- [ ] Configure Tiptap mention extension
- [ ] Create mention dropdown component
- [ ] Integrate with user source (Azure AD)
- [ ] Add @ trigger
- [ ] Add user search in dropdown
- [ ] Style mentions (pill/badge)
- [ ] Handle mention clicks
- [ ] Write tests

**Reference**: `docs/rich-text-capabilities.md` → "@Mentions Integration"

---

### Task 4.5: Add Security (XSS Prevention)
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/sanitization.ts`

**Checklist**:
- [ ] Install DOMPurify
- [ ] Create sanitization helper
- [ ] Sanitize on render
- [ ] Sanitize on save
- [ ] Add allowed tags configuration
- [ ] Test XSS attack vectors
- [ ] Document security measures

**Reference**: `docs/rich-text-capabilities.md` → "Security Considerations"

---

### Task 4.6: Update AI Prompt for Rich Text Detection
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 30 minutes  
**Files to Modify**:
- [ ] `packages/language/src/ai/prompts.ts`

**Checklist**:
- [ ] Add rich text detection patterns
- [ ] Test: "requirements", "detailed notes" → richtext
- [ ] Update tests

**Reference**: Already updated in `docs/ai-first-form-design.md`

---

### Task 4.7: Integrate Rich Text in Form Renderer
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Detect 'richtext' field type
- [ ] Render RichTextEditor component
- [ ] Pass configuration
- [ ] Handle value changes
- [ ] Test with workflow

---

## 📑 Phase 5: Section Visibility & Permissions (Week 5-6) ⭐ HIGH

**Goal**: Role-based section visibility

**Documentation**: `docs/section-visibility-guide.md`

### Task 5.1: Extend IR with Section Types
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/ir/types.ts`

**Checklist**:
- [ ] Add `FormSection` type
- [ ] Add `SectionVisibility` type
- [ ] Add `VisibilityRule` type
- [ ] Update FormLayout with sections
- [ ] Run TypeScript compilation

**Reference**: `docs/section-visibility-guide.md` → "Architecture"

---

### Task 5.2: Create Visibility Evaluator
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/language/src/forms/sectionVisibility.ts`

**Checklist**:
- [ ] Implement `evaluateSectionVisibility(section, context): Permission`
- [ ] Handle 'everyone' mode
- [ ] Handle 'conditional' mode with rules
- [ ] Evaluate subject types (user, usergroup, role, department)
- [ ] Evaluate conditions (field values)
- [ ] Handle priority resolution
- [ ] Write comprehensive tests (20+ cases)

**Reference**: `docs/section-visibility-guide.md` → "Evaluation Algorithm"

---

### Task 5.3: Server-Side Validation
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  
**Files to Create**:
- [ ] `packages/language/src/forms/serverValidation.ts`

**Checklist**:
- [ ] Re-evaluate visibility server-side
- [ ] Filter form data based on permissions
- [ ] Reject unauthorized field edits
- [ ] Validate section access
- [ ] Add audit logging
- [ ] Write security tests

**Reference**: `docs/section-visibility-guide.md` → "Server-Side Implementation"

---

### Task 5.4: Update Form Renderer for Sections
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Modify**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`
- [ ] Create `packages/studio/src/components/forms/SectionRenderer.tsx`

**Checklist**:
- [ ] Detect form sections in layout
- [ ] Evaluate visibility for each section
- [ ] Render sections based on permission:
  - [ ] Hidden: don't render
  - [ ] Readonly: render disabled
  - [ ] Editable: render interactive
- [ ] Add visual indicators (badges)
- [ ] Add collapsible sections
- [ ] Style sections
- [ ] Write tests

**Reference**: `docs/section-visibility-guide.md` → "Client-Side Rendering"

---

### Task 5.5: Test Multi-Role Workflows
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  

**Checklist**:
- [ ] Create expense approval workflow
- [ ] Test as employee (can edit request section)
- [ ] Test as manager (can edit approval section)
- [ ] Test as finance (can view all readonly)
- [ ] Verify data filtering
- [ ] Document permission patterns

**Reference**: `docs/section-visibility-guide.md` → Examples

---

## 📑 Phase 6: Repeatable Sections (Week 6-7) ⭐ HIGH

**Goal**: Dynamic arrays (invoices, families)

**Documentation**: `docs/repeatable-sections-guide.md`

### Task 6.1: Extend IR with Repeatable Types
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/ir/types.ts`

**Checklist**:
- [ ] Add 'repeatable' to FormField type union
- [ ] Add `RepeatableConfig` interface
- [ ] Add layout types (stacked, table, cards)
- [ ] Add `RepeatableTableColumn` type
- [ ] Run TypeScript compilation

**Reference**: `docs/repeatable-sections-guide.md` → "Type Definition"

---

### Task 6.2: Create RepeatableField Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 6 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/RepeatableField.tsx`

**Checklist**:
- [ ] Create component with add/remove functionality
- [ ] Implement stacked layout
- [ ] Implement table layout
- [ ] Implement cards layout
- [ ] Add min/max item validation
- [ ] Add confirmation on delete
- [ ] Add item numbering
- [ ] Style all three layouts
- [ ] Write component tests

**Reference**: `docs/repeatable-sections-guide.md` → "React Implementation"

---

### Task 6.3: Add Drag-and-Drop Reordering
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  

**Checklist**:
- [ ] Install @dnd-kit/core
- [ ] Install @dnd-kit/sortable
- [ ] Add drag handles to items
- [ ] Implement reorder logic
- [ ] Update array indices
- [ ] Add visual feedback during drag
- [ ] Test reordering
- [ ] Write tests

**Reference**: `docs/repeatable-sections-guide.md` → "React Implementation"

---

### Task 6.4: Update AI Prompt for Repeatable Detection
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 30 minutes  
**Files to Modify**:
- [ ] `packages/language/src/ai/prompts.ts`

**Checklist**:
- [ ] Add repeatable detection patterns
- [ ] Test: "multiple", "list of", "add more" → repeatable
- [ ] Test layout selection logic
- [ ] Update tests

**Reference**: Already updated in `docs/ai-first-form-design.md`

---

### Task 6.5: Integrate Repeatable in Form Renderer
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Modify**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Detect 'repeatable' field type
- [ ] Render RepeatableField component
- [ ] Pass configuration
- [ ] Handle array value changes
- [ ] Test with invoice workflow

---

### Task 6.6: Test with Real-World Examples
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  

**Checklist**:
- [ ] Test: Visa application (family members - stacked)
- [ ] Test: Invoice (line items - table)
- [ ] Test: Expense report (expenses - stacked)
- [ ] Test: Project team (members - cards)
- [ ] Verify calculations work
- [ ] Document patterns

**Reference**: `docs/repeatable-sections-guide.md` → Examples

---

## 📑 Phase 7: Audit Trail & Comments (Week 7-8) ⭐ HIGH

**Goal**: Compliance and collaboration

**Documentation**: `docs/form-audit-and-comments.md`

### Task 7.1: Extend IR with Audit Types
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 hour  
**Files to Modify**:
- [ ] `packages/language/src/ir/types.ts`

**Checklist**:
- [ ] Add `FormAuditConfig` interface
- [ ] Add `FormCommentsConfig` interface
- [ ] Add to FormDefinition
- [ ] Add `showAuditTrail`, `showComments` to FormSection
- [ ] Run TypeScript compilation

**Reference**: Already updated in `docs/form-designer-brainstorm.md`

---

### Task 7.2: Create Audit Service
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/language/src/audit/auditService.ts`
- [ ] `packages/language/src/audit/types.ts`

**Checklist**:
- [ ] Create `AuditLogEntry` type
- [ ] Implement `log()` method
- [ ] Implement `logFieldChange()` method
- [ ] Implement `logApproval()` method
- [ ] Implement `getAuditTrail()` method with filters
- [ ] Add database persistence
- [ ] Write service tests

**Reference**: `docs/form-audit-and-comments.md` → "Audit Trail Service"

---

### Task 7.3: Create Comments Service
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/language/src/comments/commentsService.ts`
- [ ] `packages/language/src/comments/types.ts`

**Checklist**:
- [ ] Create `CommentEntry` type
- [ ] Implement `addComment()` method
- [ ] Implement `getComments()` method with filters
- [ ] Implement `editComment()` method
- [ ] Implement `deleteComment()` method
- [ ] Add visibility rule enforcement
- [ ] Add @mention notifications
- [ ] Add database persistence
- [ ] Write service tests

**Reference**: `docs/form-audit-and-comments.md` → "Comments Service"

---

### Task 7.4: Create AuditTrail Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/AuditTrail.tsx`

**Checklist**:
- [ ] Create timeline-style component
- [ ] Show user, action, timestamp
- [ ] Show field changes (before/after)
- [ ] Add action icons
- [ ] Add expand/collapse
- [ ] Add filtering
- [ ] Style component
- [ ] Write tests

**Reference**: `docs/form-audit-and-comments.md` → "AuditTrail React component"

---

### Task 7.5: Create CommentThread Component
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 4 hours  
**Files to Create**:
- [ ] `packages/studio/src/components/forms/CommentThread.tsx`

**Checklist**:
- [ ] Create comment list component
- [ ] Show author, timestamp, content
- [ ] Add new comment input (reuse RichTextEditor)
- [ ] Add attachment support
- [ ] Add @mentions
- [ ] Add action badges (APPROVED, REJECTED, etc.)
- [ ] Add edit/delete for own comments
- [ ] Style component
- [ ] Write tests

**Reference**: `docs/form-audit-and-comments.md` → "CommentThread React component"

---

### Task 7.6: Integrate Audit in Form Renderer
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Modify**:
- [ ] `packages/studio/src/components/forms/SimpleFormRenderer.tsx`

**Checklist**:
- [ ] Auto-log field changes
- [ ] Auto-log form submissions
- [ ] Show audit trail in sections (if enabled)
- [ ] Show comments in sections (if enabled)
- [ ] Enforce required comments on actions
- [ ] Test with approval workflow

---

### Task 7.7: Add Compliance Reporting
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 hours  
**Files to Create**:
- [ ] `packages/language/src/audit/reporting.ts`

**Checklist**:
- [ ] Implement `exportAuditTrail(formId, format)` (CSV, PDF, JSON)
- [ ] Generate compliance reports
- [ ] Add retention policy enforcement
- [ ] Write export tests

**Reference**: `docs/form-audit-and-comments.md` → "Compliance & Reporting"

---

## 📑 Phase 8: Polish & Testing (Week 9-10) ✅ MEDIUM

**Goal**: Production readiness

### Task 8.1: Comprehensive Testing
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 1 week  

**Checklist**:
- [ ] Unit test coverage > 85%
- [ ] Integration tests for all features
- [ ] E2E tests for critical workflows
- [ ] Performance testing
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

---

### Task 8.2: Documentation & Examples
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 3 days  

**Checklist**:
- [ ] Complete API documentation
- [ ] Add JSDoc comments to all public APIs
- [ ] Create example workflows (5+ complete examples)
- [ ] Create video tutorials
- [ ] Update README with screenshots
- [ ] Create migration guide
- [ ] Create troubleshooting guide

---

### Task 8.3: Performance Optimization
**Status**: ⬜ Not Started  
**Assignee**: _________  
**Estimated Time**: 2 days  

**Checklist**:
- [ ] Bundle size optimization
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Memoization of expensive operations
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] Load testing
- [ ] Monitor metrics

---

## 📊 Status Legend

- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- 🔵 Blocked
- ⚫ Skipped

---

## 📝 Notes Section

### Decisions Made
_Record key architectural decisions here_

---

### Blockers
_List any blockers and their resolution status_

---

### Lessons Learned
_Document insights for future reference_

---

## 🎯 Quick Reference

### Critical Path Tasks (Must Do First)
1. ✅ Task 1.1: Extend IR Type System
2. ✅ Task 1.2: Create Form Inference Engine
3. ✅ Task 1.3: Integrate Form Inference into Compiler
4. ✅ Task 1.4: Create Basic Form Renderer Component
5. ✅ Task 2.3: Create AI Form Generator

### High-Value Tasks (Maximum Impact)
- Task 2.3: AI Form Generator (the "wow" feature)
- Task 3.3-3.6: User Fields (dynamic routing)
- Task 7.2-7.5: Audit & Comments (compliance)

### Quick Wins (Low Effort, High Value)
- Task 1.5: Add Form Validation
- Task 2.2: Implement System Prompt
- Task 6.4: AI Repeatable Detection

---

**Last Updated**: October 14, 2025  
**Next Review**: _________

