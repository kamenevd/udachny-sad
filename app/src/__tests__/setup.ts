import '@testing-library/jest-dom';

// Mock для matchMedia (нужен для некоторых компонентов)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock для createImageBitmap (PhotoUpload)
if (!('createImageBitmap' in window)) {
  Object.defineProperty(window, 'createImageBitmap', {
    writable: true,
    value: () => Promise.reject(new Error('Not supported in test')),
  });
}

// Mock для localStorage
if (!window.localStorage) {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
  });
}
