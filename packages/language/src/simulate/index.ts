import { IR } from '../ir/types';

export function simulate(ir: IR) {
  // TODO: implement in-memory runner
  return { start: ir.start, states: ir.states.length };
}
