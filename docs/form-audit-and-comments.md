# 📋 Form Audit Trail & Comments System

**Project**: Kflow Dynamic Form Designer  
**Feature**: Activity History & Collaborative Comments  
**Date**: October 14, 2025

---

## 📑 Table of Contents

### Foundation
- [🎯 Overview](#-overview) - Why audit trails matter
- [🏗️ Architecture](#️-architecture) - Complete type definitions
  - FormAuditConfig
  - FormCommentsConfig
  - AuditLogEntry
  - CommentEntry

### UI Components
- [🎨 UI Components](#-ui-components)
  - Audit Trail Component (timeline view)
  - Comments Component (threaded discussions)
  - Combined View (section with history + comments)

### Real-World Examples
- [💡 Example 1: Expense Approval](#-example-1-expense-approval-with-audit-trail) - Automatic logging
- [💡 Example 2: Contract Review](#-example-2-contract-review-with-internal-vs-external-comments) - Comment visibility
- [💡 Example 3: Procurement](#-example-3-procurement-with-mandatory-rejection-comments) - Required comments

### Implementation
- [💻 Implementation](#-implementation)
  - AuditService class
  - CommentsService class
  - AuditTrail React component
  - CommentThread React component
- [🎯 Integration with Other Features](#-integration-with-other-features)
  - Section visibility integration
  - Rich text in comments
- [🚀 Implementation Roadmap](#-implementation-roadmap) - 4-week plan

### Compliance
- [📊 Compliance & Reporting](#-compliance--reporting)
  - Export audit trails (CSV/PDF/JSON)
  - Compliance reports
- [🔗 Related Documentation](#-related-documentation)

---

## 🎯 Overview

When forms pass through multiple approvers or are returned for revision, we need:
1. **Audit Trail**: Automatic system log of all changes
2. **Comments**: Human-readable notes and collaboration

### Why This Matters

**Compliance Requirements**:
- Legal: "Who approved this contract on what date?"
- Financial: "Why was this expense returned?"
- HR: "What was the reason for rejection?"

**Collaboration**:
- Manager: "Please update budget breakdown"
- Requester: "Updated as requested"
- Finance: "Approved with conditions noted"

**Transparency**:
- Users see who touched what
- Clear audit trail for investigations
- No "mystery edits"

---

## 🏗️ Architecture

### Type Definitions

```typescript
// packages/language/src/ir/types.ts

export interface FormDefinition {
  id: string;
  title: string;
  fields: FormField[];
  sections?: FormSection[];
  
  // 🔥 NEW: Audit and comments
  auditConfig?: FormAuditConfig;
  commentsEnabled?: boolean;
  commentsConfig?: FormCommentsConfig;
}

// Audit Trail Configuration
export interface FormAuditConfig {
  enabled: boolean;  // Enable automatic audit logging
  trackFieldChanges?: boolean;  // Log individual field edits (default: true)
  trackSectionAccess?: boolean;  // Log section views (default: false)
  trackSubmissions?: boolean;  // Log form submissions (default: true)
  trackApprovals?: boolean;  // Log approve/reject/return actions (default: true)
  retentionDays?: number;  // How long to keep audit logs (default: 365)
  visibleTo?: AuditVisibility;  // Who can see audit logs
}

export interface AuditVisibility {
  mode: 'everyone' | 'admins-only' | 'conditional';
  roles?: string[];  // Roles that can view audit trail
  includeRequester?: boolean;  // Can requester see audit?
}

// Comments Configuration
export interface FormCommentsConfig {
  enabled: boolean;
  location: 'section' | 'form' | 'both';  // Where comments appear
  allowAttachments?: boolean;  // Can attach files to comments
  allowRichText?: boolean;  // Enable rich text in comments
  mentionsEnabled?: boolean;  // Enable @mentions
  requireCommentOn?: CommentRequirement[];  // Require comment for certain actions
  visibilityRules?: CommentVisibilityRule[];  // Who sees what comments
}

export interface CommentRequirement {
  action: 'reject' | 'return' | 'approve-with-conditions' | 'custom';
  message?: string;  // Prompt text (e.g., "Please explain why returning")
}

export interface CommentVisibilityRule {
  commentType: 'all' | 'approval-only' | 'internal' | 'external';
  visibleTo: {
    type: 'everyone' | 'role' | 'department' | 'specific-users';
    value?: string | string[];
  };
}

// Audit Log Entry (automatically generated)
export interface AuditLogEntry {
  id: string;
  formId: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  
  action: AuditAction;
  
  // Details about the change
  sectionId?: string;
  sectionName?: string;
  fieldId?: string;
  fieldLabel?: string;
  oldValue?: any;
  newValue?: any;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type AuditAction =
  | 'form_created'
  | 'form_submitted'
  | 'form_saved_draft'
  | 'field_changed'
  | 'section_viewed'
  | 'section_edited'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'reassigned'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed';

// Comment Entry (user-generated)
export interface CommentEntry {
  id: string;
  formId: string;
  sectionId?: string;  // Optional: comment on specific section
  
  timestamp: Date;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  
  content: string;  // Plain text or rich text
  contentType: 'text' | 'richtext';
  
  commentType: 'general' | 'approval' | 'return-reason' | 'internal';
  
  // Associated action
  relatedAction?: {
    type: 'approved' | 'rejected' | 'returned' | 'reassigned';
    decision?: string;
  };
  
  // Attachments
  attachments?: CommentAttachment[];
  
  // Mentions
  mentions?: string[];  // User IDs mentioned
  
  // Metadata
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

export interface CommentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

// Enhanced FormSection with audit/comments
export interface FormSection {
  id: string;
  title: string;
  fieldIds: string[];
  visibility?: SectionVisibility;
  
  // 🔥 NEW: Section-specific audit and comments
  showAuditTrail?: boolean;  // Show audit trail in this section
  showComments?: boolean;  // Show comments in this section
  requireCommentOnChange?: boolean;  // Require comment when section edited
}
```

---

## 🎨 UI Components

### 1. Audit Trail Component

```
┌──────────────────────────────────────────────────────────┐
│ 📋 Activity History                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🟢 Oct 14, 2025 2:30 PM                                 │
│ Sarah Johnson (Manager)                                  │
│ ✓ Approved                                               │
│ Comment: "Budget looks good, approved for Q4"            │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ 🟡 Oct 14, 2025 10:15 AM                                │
│ John Smith (Requester)                                   │
│ ✏️ Updated field "Budget Amount"                         │
│ Changed: $8,000 → $7,500                                 │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ 🔴 Oct 13, 2025 4:45 PM                                 │
│ Sarah Johnson (Manager)                                  │
│ ↩️ Returned for revision                                 │
│ Comment: "Please reduce budget to under $8K"             │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ 🔵 Oct 13, 2025 3:20 PM                                 │
│ John Smith (Requester)                                   │
│ 📤 Submitted form                                        │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ ⚪ Oct 13, 2025 2:00 PM                                 │
│ John Smith (Requester)                                   │
│ 📝 Created form                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2. Comments Component

```
┌──────────────────────────────────────────────────────────┐
│ 💬 Comments & Notes                                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 Sarah Johnson (Manager)                         │ │
│ │ Oct 14, 2025 2:30 PM                               │ │
│ │                                                    │ │
│ │ Budget looks good, approved for Q4. Great work    │ │
│ │ on the cost breakdown @john.smith!                │ │
│ │                                                    │ │
│ │ 🟢 APPROVED                                        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 John Smith (Requester)                          │ │
│ │ Oct 14, 2025 10:20 AM • Edited                     │ │
│ │                                                    │ │
│ │ Updated budget breakdown as requested. Reduced    │ │
│ │ travel expenses by $500 and supplies by $200.     │ │
│ │                                                    │ │
│ │ 📎 updated_budget.xlsx                             │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 Sarah Johnson (Manager)                         │ │
│ │ Oct 13, 2025 4:45 PM                               │ │
│ │                                                    │ │
│ │ Please reduce total budget to under $8,000.       │ │
│ │ Travel expenses seem high for this project.       │ │
│ │                                                    │ │
│ │ 🔴 RETURNED FOR REVISION                           │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Add a comment...                                   │ │
│ │ [                                                ] │ │
│ │ [                                                ] │ │
│ │                                                    │ │
│ │ 📎 Attach File    @Mention    [Post Comment]       │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3. Combined View (Section with History + Comments)

```
┌──────────────────────────────────────────────────────────┐
│ Manager Approval Section                      [🔒 Editable] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Approval Decision: [Approved ▼]                          │
│ Budget Amount: [$7,500.00        ]                       │
│ Approved By: Sarah Johnson                               │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 📋 Section History                            [Collapse ▼] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Oct 14, 2:30 PM - Sarah Johnson approved                 │
│ Oct 14, 10:15 AM - John Smith updated Budget Amount      │
│ Oct 13, 4:45 PM - Sarah Johnson returned for revision    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 💬 Section Comments                           [Collapse ▼] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ [3 comments - see above for detailed view]               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 💡 Real-World Examples

### Example 1: Expense Approval with Audit Trail

```typescript
const expenseForm: FormDefinition = {
  id: 'expense_claim',
  title: 'Expense Reimbursement',
  
  // Enable audit trail
  auditConfig: {
    enabled: true,
    trackFieldChanges: true,
    trackApprovals: true,
    visibleTo: {
      mode: 'conditional',
      roles: ['manager', 'finance', 'auditor'],
      includeRequester: true  // Employee can see their own history
    }
  },
  
  // Enable comments
  commentsEnabled: true,
  commentsConfig: {
    enabled: true,
    location: 'both',  // Comments on sections and overall form
    allowAttachments: true,
    mentionsEnabled: true,
    requireCommentOn: [
      {
        action: 'reject',
        message: 'Please explain why this expense is being rejected'
      },
      {
        action: 'return',
        message: 'Please specify what needs to be corrected'
      }
    ]
  },
  
  fields: [
    { id: 'amount', type: 'number', label: 'Amount' },
    { id: 'receipt', type: 'file', label: 'Receipt' }
  ],
  
  layout: {
    sections: [
      {
        id: 'expense_details',
        title: 'Expense Details',
        fieldIds: ['amount', 'receipt'],
        showAuditTrail: false,  // Don't clutter with basic changes
        showComments: false
      },
      {
        id: 'manager_approval',
        title: 'Manager Approval',
        fieldIds: ['approval_status', 'manager_notes'],
        showAuditTrail: true,  // 🔥 Show history in this section
        showComments: true,    // 🔥 Allow comments here
        requireCommentOnChange: true,  // Manager must explain decisions
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'manager' },
              permission: 'visible-editable'
            }
          ]
        }
      }
    ]
  }
};
```

**Result**: Manager sees approval history and can add comments explaining decisions.

---

### Example 2: Contract Review with Internal vs External Comments

```typescript
const contractReviewForm: FormDefinition = {
  id: 'contract_review',
  title: 'Contract Review & Approval',
  
  auditConfig: {
    enabled: true,
    trackFieldChanges: true,
    visibleTo: {
      mode: 'conditional',
      roles: ['legal', 'executive', 'compliance']
    }
  },
  
  commentsConfig: {
    enabled: true,
    location: 'both',
    allowRichText: true,
    mentionsEnabled: true,
    
    // Different comment visibility rules
    visibilityRules: [
      {
        commentType: 'internal',  // Internal legal discussions
        visibleTo: {
          type: 'department',
          value: 'legal'
        }
      },
      {
        commentType: 'approval-only',  // Final decisions
        visibleTo: {
          type: 'everyone'
        }
      },
      {
        commentType: 'external',  // Shared with client
        visibleTo: {
          type: 'everyone'
        }
      }
    ]
  },
  
  fields: [
    { id: 'contract_value', type: 'number', label: 'Contract Value' },
    { id: 'terms', type: 'richtext', label: 'Key Terms' }
  ],
  
  layout: {
    sections: [
      {
        id: 'legal_review',
        title: 'Legal Review',
        fieldIds: ['legal_approval', 'legal_notes'],
        showAuditTrail: true,
        showComments: true
      },
      {
        id: 'executive_approval',
        title: 'Executive Approval',
        fieldIds: ['executive_decision'],
        showAuditTrail: true,
        showComments: true,
        requireCommentOnChange: true
      }
    ]
  }
};
```

**Result**: Legal team has internal discussions, executives see final approvals, clients see external comments only.

---

### Example 3: Procurement with Mandatory Rejection Comments

```typescript
const purchaseOrderForm: FormDefinition = {
  id: 'purchase_order',
  title: 'Purchase Order Request',
  
  auditConfig: {
    enabled: true,
    trackApprovals: true,
    visibleTo: {
      mode: 'everyone',
      includeRequester: true
    }
  },
  
  commentsConfig: {
    enabled: true,
    location: 'section',
    
    // 🔥 Force comment on rejection
    requireCommentOn: [
      {
        action: 'reject',
        message: 'You must provide a reason for rejecting this purchase order'
      },
      {
        action: 'return',
        message: 'Please specify what information is missing or incorrect'
      },
      {
        action: 'approve-with-conditions',
        message: 'Please document the approval conditions'
      }
    ]
  },
  
  layout: {
    sections: [
      {
        id: 'approval_section',
        title: 'Approval Decision',
        fieldIds: ['decision', 'approved_amount'],
        showAuditTrail: true,
        showComments: true
      }
    ]
  }
};
```

---

## 💻 Implementation

### 1. Audit Trail Service

```typescript
// packages/language/src/audit/auditService.ts

export class AuditService {
  private logs: AuditLogEntry[] = [];

  /**
   * Log a form action
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date(),
    };

    this.logs.push(auditEntry);
    
    // Persist to database
    this.persistLog(auditEntry);
  }

  /**
   * Log field change
   */
  logFieldChange(
    formId: string,
    user: User,
    fieldId: string,
    fieldLabel: string,
    oldValue: any,
    newValue: any
  ): void {
    this.log({
      formId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'field_changed',
      fieldId,
      fieldLabel,
      oldValue,
      newValue,
    });
  }

  /**
   * Log approval action
   */
  logApproval(
    formId: string,
    user: User,
    action: 'approved' | 'rejected' | 'returned',
    sectionId?: string
  ): void {
    this.log({
      formId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      sectionId,
    });
  }

  /**
   * Get audit trail for form
   */
  getAuditTrail(
    formId: string,
    filters?: {
      sectionId?: string;
      actions?: AuditAction[];
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): AuditLogEntry[] {
    let filtered = this.logs.filter(log => log.formId === formId);

    if (filters?.sectionId) {
      filtered = filtered.filter(log => log.sectionId === filters.sectionId);
    }

    if (filters?.actions) {
      filtered = filtered.filter(log => filters.actions!.includes(log.action));
    }

    if (filters?.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    if (filters?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async persistLog(entry: AuditLogEntry): Promise<void> {
    // Save to database (MongoDB, PostgreSQL, etc.)
    await database.auditLogs.insert(entry);
  }
}
```

### 2. Comments Service

```typescript
// packages/language/src/comments/commentsService.ts

export class CommentsService {
  private comments: CommentEntry[] = [];

  /**
   * Add a comment
   */
  async addComment(
    formId: string,
    author: User,
    content: string,
    options?: {
      sectionId?: string;
      commentType?: CommentEntry['commentType'];
      relatedAction?: CommentEntry['relatedAction'];
      attachments?: CommentAttachment[];
      mentions?: string[];
    }
  ): Promise<CommentEntry> {
    const comment: CommentEntry = {
      id: generateId(),
      formId,
      sectionId: options?.sectionId,
      timestamp: new Date(),
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
        role: author.role,
        avatar: author.avatar,
      },
      content,
      contentType: 'text',
      commentType: options?.commentType ?? 'general',
      relatedAction: options?.relatedAction,
      attachments: options?.attachments,
      mentions: options?.mentions,
    };

    this.comments.push(comment);
    await this.persistComment(comment);

    // Send notifications to mentioned users
    if (comment.mentions) {
      await this.notifyMentionedUsers(comment);
    }

    return comment;
  }

  /**
   * Get comments for form or section
   */
  getComments(
    formId: string,
    options?: {
      sectionId?: string;
      commentType?: CommentEntry['commentType'];
      visibleTo?: User;
    }
  ): CommentEntry[] {
    let filtered = this.comments.filter(c => c.formId === formId);

    if (options?.sectionId) {
      filtered = filtered.filter(c => c.sectionId === options.sectionId);
    }

    if (options?.commentType) {
      filtered = filtered.filter(c => c.commentType === options.commentType);
    }

    // Apply visibility rules
    if (options?.visibleTo) {
      filtered = filtered.filter(c => 
        this.canUserSeeComment(c, options.visibleTo!)
      );
    }

    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Edit a comment
   */
  async editComment(
    commentId: string,
    newContent: string,
    editor: User
  ): Promise<CommentEntry | null> {
    const comment = this.comments.find(c => c.id === commentId);
    
    if (!comment) return null;
    
    // Only author can edit
    if (comment.author.id !== editor.id) {
      throw new Error('Only comment author can edit');
    }

    comment.content = newContent;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await this.persistComment(comment);
    return comment;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, deleter: User): Promise<void> {
    const comment = this.comments.find(c => c.id === commentId);
    
    if (!comment) return;
    
    // Only author or admin can delete
    if (comment.author.id !== deleter.id && !deleter.roles.includes('admin')) {
      throw new Error('Unauthorized to delete comment');
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    
    await this.persistComment(comment);
  }

  private canUserSeeComment(comment: CommentEntry, user: User): boolean {
    // Apply visibility rules based on comment type
    switch (comment.commentType) {
      case 'internal':
        return user.department === comment.author.role;
      case 'approval-only':
        return true;  // Everyone sees approval comments
      case 'external':
        return true;
      default:
        return true;
    }
  }

  private async notifyMentionedUsers(comment: CommentEntry): Promise<void> {
    // Send email/push notifications to mentioned users
    for (const userId of comment.mentions ?? []) {
      await notificationService.send(userId, {
        type: 'mention',
        title: `${comment.author.name} mentioned you`,
        body: comment.content,
        link: `/forms/${comment.formId}`,
      });
    }
  }

  private async persistComment(comment: CommentEntry): Promise<void> {
    await database.comments.upsert(comment.id, comment);
  }
}
```

### 3. React Components

```typescript
// packages/studio/src/components/AuditTrail.tsx

import React from 'react';
import { AuditLogEntry } from '@kflow/language/ir/types';
import { formatDistanceToNow } from 'date-fns';

interface AuditTrailProps {
  formId: string;
  sectionId?: string;  // Optional: show only section-specific audit
  maxItems?: number;  // Limit display
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  formId,
  sectionId,
  maxItems = 50,
}) => {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    // Fetch audit logs
    auditService.getAuditTrail(formId, { sectionId }).then(setLogs);
  }, [formId, sectionId]);

  const getActionIcon = (action: AuditLogEntry['action']): string => {
    switch (action) {
      case 'approved': return '🟢';
      case 'rejected': return '🔴';
      case 'returned': return '🟡';
      case 'field_changed': return '✏️';
      case 'form_submitted': return '📤';
      case 'comment_added': return '💬';
      default: return '⚪';
    }
  };

  const getActionText = (log: AuditLogEntry): string => {
    switch (log.action) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'returned':
        return 'Returned for revision';
      case 'field_changed':
        return `Updated "${log.fieldLabel}"`;
      case 'form_submitted':
        return 'Submitted form';
      case 'form_created':
        return 'Created form';
      case 'comment_added':
        return 'Added comment';
      default:
        return log.action;
    }
  };

  const displayLogs = expanded ? logs : logs.slice(0, 5);

  return (
    <div className="audit-trail">
      <div className="audit-trail-header">
        <h4>📋 Activity History</h4>
        {logs.length > 5 && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : `Show All (${logs.length})`}
          </button>
        )}
      </div>

      <div className="audit-trail-entries">
        {displayLogs.map(log => (
          <div key={log.id} className="audit-entry">
            <div className="audit-icon">{getActionIcon(log.action)}</div>
            
            <div className="audit-content">
              <div className="audit-action">
                {getActionIcon(log.action)} {getActionText(log)}
              </div>
              
              <div className="audit-user">
                {log.userName} ({log.userRole})
              </div>
              
              {log.action === 'field_changed' && (
                <div className="audit-change">
                  <span className="old-value">{formatValue(log.oldValue)}</span>
                  {' → '}
                  <span className="new-value">{formatValue(log.newValue)}</span>
                </div>
              )}
              
              <div className="audit-timestamp">
                {formatDistanceToNow(log.timestamp, { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
```

```typescript
// packages/studio/src/components/CommentThread.tsx

import React, { useState } from 'react';
import { CommentEntry } from '@kflow/language/ir/types';
import { RichTextEditor } from './RichTextEditor';

interface CommentThreadProps {
  formId: string;
  sectionId?: string;
  currentUser: User;
  requireCommentFor?: 'approval' | 'rejection' | 'return';
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  formId,
  sectionId,
  currentUser,
  requireCommentFor,
}) => {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    commentsService.getComments(formId, { sectionId }).then(setComments);
  }, [formId, sectionId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await commentsService.addComment(
        formId,
        currentUser,
        newComment,
        { sectionId }
      );
      
      setComments([...comments, comment]);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="comment-thread">
      <div className="comment-thread-header">
        <h4>💬 Comments & Notes</h4>
        <span className="comment-count">{comments.length}</span>
      </div>

      <div className="comments-list">
        {comments.map(comment => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </div>

      <div className="new-comment-box">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="user-avatar"
        />
        
        <div className="comment-input">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          
          <div className="comment-actions">
            <button className="attach-button">📎 Attach</button>
            <button className="mention-button">@ Mention</button>
            
            <button
              className="post-button"
              onClick={handlePostComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      {requireCommentFor && (
        <div className="comment-requirement">
          ⚠️ Comment required when {requireCommentFor}
        </div>
      )}
    </div>
  );
};

const CommentCard: React.FC<{ comment: CommentEntry }> = ({ comment }) => {
  const [isEditing, setIsEditing] = useState(false);

  const getBadgeForAction = (action?: CommentEntry['relatedAction']) => {
    if (!action) return null;

    const badges = {
      approved: { text: '✓ APPROVED', className: 'badge-approved' },
      rejected: { text: '✗ REJECTED', className: 'badge-rejected' },
      returned: { text: '↩️ RETURNED', className: 'badge-returned' },
    };

    const badge = badges[action.type];
    if (!badge) return null;

    return <span className={`action-badge ${badge.className}`}>{badge.text}</span>;
  };

  return (
    <div className="comment-card">
      <div className="comment-header">
        <img src={comment.author.avatar} alt={comment.author.name} className="avatar" />
        
        <div className="comment-meta">
          <span className="author-name">{comment.author.name}</span>
          <span className="author-role">({comment.author.role})</span>
          <span className="comment-time">
            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
          </span>
          {comment.isEdited && <span className="edited-badge">• Edited</span>}
        </div>
      </div>

      <div className="comment-body">
        {comment.content}
      </div>

      {comment.relatedAction && (
        <div className="comment-action">
          {getBadgeForAction(comment.relatedAction)}
        </div>
      )}

      {comment.attachments && comment.attachments.length > 0 && (
        <div className="comment-attachments">
          {comment.attachments.map(att => (
            <a key={att.id} href={att.url} className="attachment">
              📎 {att.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 Integration with Other Features

### Integration with Section Visibility

Combine audit trail with section permissions (see [section-visibility-guide.md](./section-visibility-guide.md) for full permission system details):

```typescript
const hiringForm: FormDefinition = {
  id: 'candidate_evaluation',
  title: 'Candidate Evaluation',
  
  auditConfig: {
    enabled: true,
    trackApprovals: true,
    visibleTo: {
      mode: 'conditional',
      roles: ['recruiter', 'hiring_manager', 'hr'],
      includeRequester: false
    }
  },
  
  commentsEnabled: true,
  
  layout: {
    sections: [
      {
        id: 'recruiter_screening',
        title: 'Initial Screening',
        fieldIds: ['screening_score', 'pass_to_interview'],
        showAuditTrail: true,  // Show who screened
        showComments: true,
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'recruiter' },
              permission: 'visible-editable'
            },
            {
              // Others see readonly after screening
              subject: { type: 'role', value: ['hiring_manager', 'hr'] },
              permission: 'visible-readonly',
              condition: {
                fieldId: 'pass_to_interview',
                operator: 'exists'
              }
            }
          ]
        }
      },
      {
        id: 'final_decision',
        title: 'Hiring Decision',
        fieldIds: ['offer_decision', 'justification'],
        showAuditTrail: true,  // Critical for compliance
        showComments: true,
        requireCommentOnChange: true,  // Must explain decision
        visibility: {
          mode: 'conditional',
          rules: [
            {
              subject: { type: 'role', value: 'hiring_manager' },
              permission: 'visible-editable'
            }
          ]
        }
      }
    ]
  }
};
```

---

## 🚀 Implementation Roadmap

### Week 1: Audit Trail
- [ ] AuditLogEntry type and database schema
- [ ] AuditService implementation
- [ ] Automatic logging on field changes
- [ ] AuditTrail React component

### Week 2: Comments System
- [ ] CommentEntry type and database schema
- [ ] CommentsService implementation
- [ ] CommentThread React component
- [ ] Comment attachments

### Week 3: Advanced Features
- [ ] Required comments on actions
- [ ] @Mentions with notifications (see [rich-text-capabilities.md](./rich-text-capabilities.md) for @mention implementation)
- [ ] Internal vs external comments
- [ ] Edit/delete comments
- [ ] Rich text in comments (reuse RichTextEditor component)

### Week 4: Integration
- [ ] Section-specific audit trails (integrate with [section-visibility-guide.md](./section-visibility-guide.md) permissions)
- [ ] Permission-based visibility
- [ ] Export audit logs (CSV/PDF)
- [ ] Testing & documentation

---

## 📊 Compliance & Reporting

### Export Audit Trail

```typescript
export function exportAuditTrail(
  formId: string,
  format: 'csv' | 'pdf' | 'json'
): string {
  const logs = auditService.getAuditTrail(formId);
  
  if (format === 'csv') {
    return convertToCSV(logs);
  } else if (format === 'pdf') {
    return generatePDF(logs);
  } else {
    return JSON.stringify(logs, null, 2);
  }
}
```

### Compliance Reports

- **Who approved what and when**
- **Who made changes to sensitive fields**
- **Complete timeline of form lifecycle**
- **User activity reports**

---

## 🔗 Related Documentation

- **[section-visibility-guide.md](./section-visibility-guide.md)** - Permission system that controls who sees audit trails and can post comments
- **[rich-text-capabilities.md](./rich-text-capabilities.md)** - Rich text editor for comment composition with @mentions
- **[form-designer-brainstorm.md](./form-designer-brainstorm.md)** - Complete IR type system including audit and comment configurations

---

*Audit trails: Because "who did what" matters! 📋*
