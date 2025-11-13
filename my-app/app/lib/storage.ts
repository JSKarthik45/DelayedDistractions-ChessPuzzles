// Lightweight storage wrapper that prefers AsyncStorage if installed,
// and falls back to an in-memory map during development.
// Install for persistence: npm i @react-native-async-storage/async-storage --save

type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let storage: Store;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  storage = {
    getItem: (k: string) => AsyncStorage.getItem(k),
    setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
  } as Store;
} catch {
  const mem: Record<string, string> = {};
  storage = {
    async getItem(k: string) {
      return k in mem ? mem[k] : null;
    },
    async setItem(k: string, v: string) {
      mem[k] = v;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "AsyncStorage not installed; onboarding completion won't persist across reloads.\n" +
            "Install: npm i @react-native-async-storage/async-storage --save"
        );
      }
    },
  } as Store;
}

export default storage;
