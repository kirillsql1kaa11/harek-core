import { IEventBus, EventCallback, EventSubscription } from 'harek-sdk';

export interface EventRecord {
  event: string;
  payload: unknown;
  timestamp: number;
}

export class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventCallback<any>>> = new Map();
  private history: EventRecord[] = [];
  private maxHistorySize = 100;

  on<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return {
      unsubscribe: () => {
        this.off(event, callback);
      }
    };
  }

  once<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    const wrapper: EventCallback<T> = async (payload: T) => {
      this.off(event, wrapper);
      await callback(payload);
    };
    return this.on(event, wrapper);
  }

  off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.recordEvent(event, payload);
    const set = this.listeners.get(event);
    if (!set) return;

    for (const callback of Array.from(set)) {
      try {
        const result = callback(payload as T);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`Ошибка в асинхронном обработчике события '${event}':`, error);
          });
        }
      } catch (error) {
        console.error(`Ошибка в синхронном обработчике события '${event}':`, error);
      }
    }
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  getHistory(): ReadonlyArray<EventRecord> {
    return this.history;
  }

  private recordEvent(event: string, payload: unknown): void {
    this.history.push({ event, payload, timestamp: Date.now() });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}
