import { PluginManifest, WidgetBounds } from 'harek-sdk';
import { Kernel } from '../kernel/Kernel.js';
import { WidgetContainer } from './WidgetContainer.js';

export class BoardCanvas {
  readonly element: HTMLElement;
  private widgets: Map<string, WidgetContainer> = new Map();
  private highestZIndex = 10;
  private dropOverlay: HTMLElement;

  constructor(private kernel: Kernel) {
    this.element = this.createDOM();
    this.dropOverlay = this.createDropOverlay();
    this.element.appendChild(this.dropOverlay);
    this.bindDropEvents();
    this.bindSlotIntegration();

    this.kernel.plugins.setUnmountHandler((pluginId) => {
      this.removeWidget(pluginId);
    });
  }

  private createDOM(): HTMLElement {
    const canvas = document.createElement('div');
    canvas.id = 'harek-board-canvas';
    canvas.className = 'harek-board-canvas';
    return canvas;
  }

  private createDropOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'harek-drop-overlay';
    overlay.innerHTML = `
      <div class="harek-drop-content">
        <div class="harek-drop-icon-ring"></div>
        <h3>Перетащите плагин на доску</h3>
        <p>Поддерживаются архивы .harekplugin, .zip или манифесты manifest.json</p>
      </div>
    `;
    return overlay;
  }

  private bindDropEvents(): void {
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropOverlay.classList.add('is-active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        this.dropOverlay.classList.remove('is-active');
      }
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropOverlay.classList.remove('is-active');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const dropCoords = { x: Math.max(20, e.clientX - 100), y: Math.max(80, e.clientY - 40) };

      try {
        if (file.name.endsWith('.zip') || file.name.endsWith('.harekplugin')) {
          const buffer = await file.arrayBuffer();
          await this.kernel.plugins.installFromZip(buffer, dropCoords);
          this.kernel.logger.info(`Плагин из файла '${file.name}' успешно загружен и установлен`);
        } else if (file.name === 'manifest.json') {
          const text = await file.text();
          const manifestJson = JSON.parse(text);
          this.kernel.logger.warn(`Загружен манифест '${manifestJson.name}'. Требуется полный архив плагина для запуска.`);
        } else {
          this.kernel.logger.error(`Неподдерживаемый формат файла: '${file.name}'. Требуется .zip или .harekplugin.`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.kernel.logger.error(`Сбой установки плагина '${file.name}': ${msg}`);
      }
    });
  }

  mountWidget(
    id: string,
    manifest: PluginManifest,
    content: HTMLElement,
    bounds: WidgetBounds,
    onClose: () => void
  ): void {
    this.highestZIndex++;
    const container = new WidgetContainer({
      id,
      manifest,
      content,
      bounds,
      onBoundsChange: (newBounds) => {
        const record = this.kernel.plugins.getPluginRecord(id);
        if (record) {
          record.bounds = newBounds;
        }
      },
      onToggleEnabled: async () => {
        await this.kernel.plugins.disablePlugin(id);
      },
      onClose: () => {
        onClose();
        this.removeWidget(id);
      },
      onFocus: () => {
        this.highestZIndex++;
        container.setZIndex(this.highestZIndex);
      }
    });

    container.setZIndex(this.highestZIndex);
    this.widgets.set(id, container);
    this.element.appendChild(container.element);
  }

  removeWidget(id: string): void {
    const container = this.widgets.get(id);
    if (container) {
      container.element.remove();
      this.widgets.delete(id);
    }
  }

  clearBoard(): void {
    for (const [id] of Array.from(this.widgets.entries())) {
      this.kernel.plugins.uninstallPlugin(id);
      this.removeWidget(id);
    }
  }

  private bindSlotIntegration(): void {
    this.kernel.slots.registerSlotItem('slot:workspace', 'board-canvas', () => this.element);
  }
}
