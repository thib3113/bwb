import 'fake-indexeddb/auto';

// Mock global objects if needed
global.console = {
  ...console,
  // uncomment to ignore specific console messages
  // error: vi.fn(),
};
