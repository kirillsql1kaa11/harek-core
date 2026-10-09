import {
  IKernelControl,
  PluginManifest
} from 'harek-sdk';
import { EventBus } from './EventBus.js';
import { ServiceRegistry } from './ServiceRegistry.js';
import { HookRegistry } from './HookRegistry.js';
import { UISlotRegistry } from './UISlotRegistry.js';
import { PluginStorage } from './PluginStorage.js';
import { Logger } from './Logger.js';
import { PluginManager } from './PluginManager.js';

export class Kernel implements IKernelControl {
  readonly manifest: Readonly<PluginManifest>;
  readonly events: EventBus;
  readonly storage: PluginStorage;
  readonly logger: Logger;
  readonly services: ServiceRegistry;
  readonly hooks: HookRegistry;
  readonly slots: UISlotRegistry;
  readonly plugins: PluginManager;

  private isReady = false;

  constructor() {
    this.manifest = {
      id: 'com.harek.core',
      name: 'Harek Core',
      version: '0.1.0',
      author: 'Harek Team',
      type: 'core-extension',
      entry: 'main.ts'
    };

    this.events = new EventBus();
    this.services = new ServiceRegistry();
    this.hooks = new HookRegistry();
    this.slots = new UISlotRegistry();
    this.storage = new PluginStorage('core');
    this.logger = new Logger('Kernel', this.events);
    this.plugins = new PluginManager(this, this.events);

    this.registerCoreServices();
  }

  get installedPlugins(): ReadonlyArray<PluginManifest> {
    return this.plugins.getInstalledPlugins();
  }

  async boot(): Promise<void> {
    if (this.isReady) return;

    this.logger.info('Инициализация микроядра Harek Core...');
    await this.hooks.get('onKernelReady').call(this, undefined);
    this.isReady = true;
    this.logger.info('Микроядро Harek успешно запущено и готово к работе');
    this.events.emit('kernel:ready', { timestamp: Date.now() });
  }

  async shutdown(): Promise<void> {
    this.logger.warn('Остановка микроядра Harek...');
    for (const manifest of this.installedPlugins) {
      await this.plugins.uninstallPlugin(manifest.id);
    }
    await this.hooks.get('onKernelShutdown').call(this, undefined);
    this.isReady = false;
    this.events.emit('kernel:shutdown', { timestamp: Date.now() });
  }

  private registerCoreServices(): void {
    this.services.register('eventBus', this.events);
    this.services.register('hookRegistry', this.hooks);
    this.services.register('slotRegistry', this.slots);
    this.services.register('logger', this.logger);
  }
}
