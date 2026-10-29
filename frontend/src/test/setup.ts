import '@testing-library/jest-dom';

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock matchMedia for jsdom
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

// Mock Web Speech API SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  start() {
    if (this.onstart) this.onstart();
  }
  stop() {
    if (this.onend) this.onend();
  }
  abort() {
    if (this.onend) this.onend();
  }
}

(window as any).SpeechRecognition = MockSpeechRecognition;
(window as any).webkitSpeechRecognition = MockSpeechRecognition;

// Mock window.speechSynthesis
(window as any).speechSynthesis = {
  speak: () => {},
  cancel: () => {},
  pause: () => {},
  resume: () => {},
  getVoices: () => [],
};
