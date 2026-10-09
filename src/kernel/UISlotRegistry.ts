import { IUISlotRegistry, UISlotId } from 'harek-sdk';

export interface SlotItem {
  id: string;
  factory: () => HTMLElement;
}

export class UISlotRegistry implements IUISlotRegistry {
  private slots: Map<string, Map<string, () => HTMLElement>> = new Map();
  private listeners: Set<(slotId: string) => void> = new Set();

  registerSlotItem(slotId: UISlotId, itemId: string, elementFactory: () => HTMLElement): void {
    if (!this.slots.has(slotId)) {
      this.slots.set(slotId, new Map());
    }
    const slot = this.slots.get(slotId)!;
    slot.set(itemId, elementFactory);
    this.notifyListeners(slotId);
  }

  unregisterSlotItem(slotId: UISlotId, itemId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) return false;
    const removed = slot.delete(itemId);
    if (removed) {
      this.notifyListeners(slotId);
    }
    return removed;
  }

  getSlotItems(slotId: UISlotId): SlotItem[] {
    const slot = this.slots.get(slotId);
    if (!slot) return [];
    return Array.from(slot.entries()).map(([id, factory]) => ({ id, factory }));
  }

  onSlotChange(listener: (slotId: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(slotId: string): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(slotId);
      } catch (error) {
        console.error('Ошибка в подписчике слота UI:', error);
      }
    }
  }
}
