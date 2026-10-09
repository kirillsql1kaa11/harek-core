import { IPluginStorage } from 'harek-sdk';

export class PluginStorage implements IPluginStorage {
  private prefix: string;

  constructor(pluginId: string) {
    this.prefix = `harek:plugin:${pluginId}:`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Ошибка сохранения ключа '${key}' в PluginStorage:`, error);
    }
  }

  async delete(key: string): Promise<boolean> {
    const exists = localStorage.getItem(this.prefix + key) !== null;
    localStorage.removeItem(this.prefix + key);
    return exists;
  }

  async clear(): Promise<void> {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(this.prefix)) {
        keysToDelete.push(storageKey);
      }
    }
    for (const key of keysToDelete) {
      localStorage.removeItem(key);
    }
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(this.prefix)) {
        result.push(storageKey.slice(this.prefix.length));
      }
    }
    return result;
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + key) !== null;
  }
}
