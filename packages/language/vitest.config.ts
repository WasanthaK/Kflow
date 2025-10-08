import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    deps: {
      optimizer: {
        ssr: {
          include: ['bpmn-moddle'],
        },
      },
    },
  },
});
