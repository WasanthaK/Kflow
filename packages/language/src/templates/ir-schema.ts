import type { IR } from '../ir/types.js';

export const sampleExpenseReimbursementIr: IR = {
  name: 'Expense Reimbursement',
  start: 'submit',
  states: [
    { id: 'submit', kind: 'userTask', prompt: 'employee submit {receipt}', next: 'validate' },
    { id: 'validate', kind: 'task', action: 'validate receipt details', next: 'decision' },
    {
      id: 'decision',
      kind: 'choice',
      branches: [{ cond: '{amount} > 1000', next: 'managerApproval' }],
      otherwise: 'autoProcess',
    },
    { id: 'managerApproval', kind: 'userTask', prompt: 'manager approve reimbursement', next: 'notify' },
    { id: 'autoProcess', kind: 'task', action: 'process automatically', next: 'notify' },
    { id: 'notify', kind: 'send', channel: 'email', to: 'employee', message: 'Reimbursement processed', next: 'stop' },
    { id: 'stop', kind: 'stop', reason: 'complete' },
  ],
};
