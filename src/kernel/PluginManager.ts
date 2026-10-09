import {
  PluginManifest,
  validateManifest,
  IWidgetPlugin,
  ICoreExtension,
  HarekPlugin,
  IWidgetContext,
  WidgetBounds,
  PluginLifecycleError
} from 'harek-sdk';
import JSZip from 'jszip';
import { EventBus } from './EventBus.js';
import { PluginStorage } from './PluginStorage.js';
import { Logger } from './Logger.js';
import type { Kernel } from './Kernel.js';

export interface LoadedPluginRecord {
  manifest: PluginManifest;
  instance: HarekPlugin;
  container?: HTMLElement;
  bounds?: WidgetBounds;
  unmounted?: boolean;
}

export type WidgetMountHandler = (
  pluginId: string,
  manifest: PluginManifest,
  container: HTMLElement,
  bounds: WidgetBounds,
  onClose: () => void
) => void;

export class PluginManager {
  private kernel: Kernel;
  private eventBus: EventBus;
  private plugins: Map<string, LoadedPluginRecord> = new Map();
  private mountHandler: WidgetMountHandler | null = null;

  constructor(kernel: Kernel, eventBus: EventBus) {
    this.kernel = kernel;
    this.eventBus = eventBus;
  }

  setMountHandler(handler: WidgetMountHandler): void {
    this.mountHandler = handler;
  }

  async installFromZip(arrayBuffer: ArrayBuffer, position?: { x: number; y: number }): Promise<PluginManifest> {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Архив плагина не содержит обязательного файла manifest.json');
    }

    const manifestText = await manifestFile.async('text');
    let parsedManifest: unknown;
    try {
      parsedManifest = JSON.parse(manifestText);
    } catch {
      throw new Error('Файл manifest.json содержит невалидный JSON');
    }

    const manifest = validateManifest(parsedManifest);
    const entryFile = zip.file(manifest.entry);
    if (!entryFile) {
      throw new Error(`Точка входа плагина '${manifest.entry}' не найдена в архиве`);
    }

    const code = await entryFile.async('text');
    return this.installFromSource(manifest, code, position);
  }

  async installFromSource(
    manifestRaw: unknown,
    codeOrFactory: string | (() => HarekPlugin),
    position?: { x: number; y: number }
  ): Promise<PluginManifest> {
    const manifest = validateManifest(manifestRaw);

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Плагин с идентификатором '${manifest.id}' уже установлен`);
    }

    await this.kernel.hooks.get('beforePluginLoad').call(this.kernel, {
      pluginId: manifest.id,
      archivePath: manifest.entry
    });

    let pluginInstance: HarekPlugin;
    if (typeof codeOrFactory === 'function') {
      pluginInstance = codeOrFactory();
    } else {
      pluginInstance = await this.instantiateCode(codeOrFactory);
    }

    const pluginLogger = new Logger(`Plugin:${manifest.id}`, this.eventBus);
    const pluginStorage = new PluginStorage(manifest.id);

    if (manifest.type === 'core-extension') {
      const extension = pluginInstance as ICoreExtension;
      if (typeof extension.onKernelBoot !== 'function') {
        throw new PluginLifecycleError(manifest.id, 'boot', new Error('Расширение ядра обязано реализовывать метод onKernelBoot'));
      }
      await extension.onKernelBoot(this.kernel);
      this.plugins.set(manifest.id, { manifest, instance: pluginInstance });
      pluginLogger.info(`Системное расширение ядра '${manifest.name}' успешно активировано`);
    } else if (manifest.type === 'board-widget') {
      const widget = pluginInstance as IWidgetPlugin;
      if (typeof widget.render !== 'function') {
        throw new PluginLifecycleError(manifest.id, 'render', new Error('Виджет обязан реализовывать метод render'));
      }

      const initialWidth = manifest.defaultSize?.width || 320;
      const initialHeight = manifest.defaultSize?.height || 220;
      const bounds: WidgetBounds = {
        x: position?.x ?? (100 + (this.plugins.size % 5) * 40),
        y: position?.y ?? (100 + (this.plugins.size % 5) * 40),
        width: initialWidth,
        height: initialHeight
      };

      const container = document.createElement('div');
      container.className = 'harek-widget-content';

      const widgetContext: IWidgetContext = {
        manifest,
        widgetId: manifest.id,
        events: this.eventBus,
        storage: pluginStorage,
        logger: pluginLogger,
        getBounds: () => ({ ...bounds }),
        setBounds: (newBounds: Partial<WidgetBounds>) => {
          Object.assign(bounds, newBounds);
          if (typeof widget.onResize === 'function') {
            widget.onResize(bounds);
          }
        }
      };

      if (typeof widget.onLoad === 'function') {
        await widget.onLoad(widgetContext);
      }

      widget.render(container);

      const record: LoadedPluginRecord = {
        manifest,
        instance: pluginInstance,
        container,
        bounds
      };
      this.plugins.set(manifest.id, record);

      if (this.mountHandler) {
        this.mountHandler(manifest.id, manifest, container, bounds, () => {
          this.uninstallPlugin(manifest.id);
        });
      }

      pluginLogger.info(`Виджет '${manifest.name}' успешно смонтирован на доску`);
    }

    await this.kernel.hooks.get('afterPluginLoad').call(this.kernel, {
      pluginId: manifest.id,
      manifest
    });

    this.eventBus.emit('plugin:installed', manifest);
    return manifest;
  }

  async uninstallPlugin(pluginId: string): Promise<boolean> {
    const record = this.plugins.get(pluginId);
    if (!record) return false;

    await this.kernel.hooks.get('beforePluginUnload').call(this.kernel, { pluginId });

    if (record.manifest.type === 'core-extension') {
      const ext = record.instance as ICoreExtension;
      if (typeof ext.onKernelShutdown === 'function') {
        await ext.onKernelShutdown();
      }
    } else if (record.manifest.type === 'board-widget') {
      const widget = record.instance as IWidgetPlugin;
      if (typeof widget.onUnload === 'function') {
        await widget.onUnload();
      }
      if (record.container && record.container.parentElement) {
        record.container.parentElement.remove();
      }
    }

    this.plugins.delete(pluginId);
    this.eventBus.emit('plugin:uninstalled', { pluginId, manifest: record.manifest });
    return true;
  }

  getInstalledPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((r) => r.manifest);
  }

  getPluginRecord(pluginId: string): LoadedPluginRecord | undefined {
    return this.plugins.get(pluginId);
  }

  private async instantiateCode(code: string): Promise<HarekPlugin> {
    const blob = new Blob([code], { type: 'application/javascript' });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const module = await import(objectUrl);
      const ExportedClass = module.default || module;
      if (typeof ExportedClass === 'function') {
        return new ExportedClass();
      } else if (typeof ExportedClass === 'object' && ExportedClass !== null) {
        return ExportedClass as HarekPlugin;
      }
      throw new Error('Модуль плагина должен экспортировать класс или объект по умолчанию');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
