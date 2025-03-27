import { vi } from 'vitest';

export function createMockResponse(success: boolean, data: any = {}) {
  return {
    ok: success,
    json: vi.fn().mockResolvedValue(data),
    statusText: success ? 'OK' : 'Error',
  };
}

export function mockVectorizeApiMethod(apiClass: any, method: string, response: any) {
  const mockImplementation = vi.fn().mockResolvedValue(response);
  
  if (apiClass.prototype) {
    vi.spyOn(apiClass.prototype, method).mockImplementation(mockImplementation);
  } else {
    apiClass[method] = mockImplementation;
  }
  
  return mockImplementation;
}
