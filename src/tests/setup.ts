import { vi } from 'vitest';

vi.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

process.env.VECTORIZE_ORG_ID = 'test-org-id';
process.env.VECTORIZE_TOKEN = 'test-token';

export function resetTestEnvironment() {
  vi.clearAllMocks();
  process.env.VECTORIZE_ORG_ID = 'test-org-id';
  process.env.VECTORIZE_TOKEN = 'test-token';
  delete process.env.VECTORIZE_PIPELINE_ID;
}
