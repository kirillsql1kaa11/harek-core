import {
  PluginManifest,
  IWidgetPlugin,
  ICoreExtension,
  IWidgetContext,
  IKernelControl,
  HarekPlugin
} from 'harek-sdk';

class ClockWidgetPlugin implements IWidgetPlugin {
  private timer: number | null = null;
  private timeEl: HTMLElement | null = null;
  private uptimeEl: HTMLElement | null = null;
  private startTime = Date.now();
  private context: IWidgetContext | null = null;

  async onLoad(context: IWidgetContext): Promise<void> {
    this.context = context;
    await context.storage.set('lastLoaded', Date.now());
  }

  render(container: HTMLElement): void {
    container.innerHTML = `
      <div class="clock-widget-ui">
        <div class="clock-time-display" id="clock-time">00:00:00</div>
        <div class="clock-date-display" id="clock-date">Загрузка...</div>
        <div class="clock-uptime" id="clock-uptime">Аптайм ядра: 0 сек</div>
      </div>
    `;

    this.timeEl = container.querySelector('#clock-time');
    const dateEl = container.querySelector('#clock-date');
    this.uptimeEl = container.querySelector('#clock-uptime');

    const update = () => {
      const now = new Date();
      if (this.timeEl) {
        this.timeEl.textContent = now.toLocaleTimeString();
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('ru-RU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      if (this.uptimeEl) {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.uptimeEl.textContent = `Аптайм виджета: ${uptimeSeconds} сек`;
      }
      if (this.context) {
        this.context.events.emit('clock:tick', { timestamp: now.getTime() });
      }
    };

    update();
    this.timer = window.setInterval(update, 1000);
  }

  async onUnload(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const clockManifest: PluginManifest = {
  id: 'com.harek.demo.clock',
  name: 'Системные часы и время',
  version: '1.0.0',
  author: 'Harek Core Team',
  description: 'Отображает текущее время, дату и аптайм, отправляя ежесекундные события в шину ядра.',
  type: 'board-widget',
  entry: 'ClockWidget.js',
  permissions: ['storage:local'],
  defaultSize: {
    width: 320,
    height: 180,
    minWidth: 260,
    minHeight: 150
  }
};

class EventBusMonitorPlugin implements IWidgetPlugin {
  private subscription: { unsubscribe: () => void } | null = null;
  private listEl: HTMLElement | null = null;
  private counter = 0;

  async onLoad(context: IWidgetContext): Promise<void> {
    this.subscription = context.events.on('clock:tick', () => {
      this.addEventRow('clock:tick');
    });
  }

  render(container: HTMLElement): void {
    container.innerHTML = `
      <div class="event-monitor-ui">
        <div class="event-monitor-header">
          <span>События в реальном времени:</span>
          <span class="event-counter" id="ev-counter">0 событий</span>
        </div>
        <div class="event-monitor-list" id="ev-list"></div>
      </div>
    `;

    this.listEl = container.querySelector('#ev-list');
  }

  private addEventRow(eventName: string): void {
    if (!this.listEl) return;
    this.counter++;
    const counterEl = this.listEl.parentElement?.querySelector('#ev-counter');
    if (counterEl) {
      counterEl.textContent = `${this.counter} событий`;
    }

    const row = document.createElement('div');
    row.className = 'event-monitor-row';
    row.innerHTML = `
      <span class="ev-time">${new Date().toLocaleTimeString()}</span>
      <span class="ev-name"><code>${eventName}</code></span>
    `;
    this.listEl.prepend(row);

    if (this.listEl.children.length > 25) {
      this.listEl.removeChild(this.listEl.lastChild!);
    }
  }

  async onUnload(): Promise<void> {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

const busMonitorManifest: PluginManifest = {
  id: 'com.harek.demo.bus-monitor',
  name: 'Монитор шины событий',
  version: '1.0.0',
  author: 'Harek Core Team',
  description: 'Интерактивный виджет для отслеживания трафика событий между плагинами и ядром в реальном времени.',
  type: 'board-widget',
  entry: 'EventBusMonitor.js',
  defaultSize: {
    width: 360,
    height: 240,
    minWidth: 300,
    minHeight: 200
  }
};

class NeonThemeExtension implements ICoreExtension {
  private styleEl: HTMLStyleElement | null = null;

  async onKernelBoot(kernel: IKernelControl): Promise<void> {
    kernel.logger.info('Активация системного расширения неоновой темы ядра...');

    this.styleEl = document.createElement('style');
    this.styleEl.id = 'harek-neon-theme';
    this.styleEl.textContent = `
      :root {
        --harek-accent-color: #00ffcc !important;
        --harek-glow: 0 0 20px rgba(0, 255, 204, 0.4) !important;
        --harek-card-border: 1px solid rgba(0, 255, 204, 0.3) !important;
      }
      .harek-widget-card {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 255, 204, 0.15) !important;
      }
      .harek-toolbar-logo {
        text-shadow: 0 0 12px #00ffcc !important;
      }
    `;
    document.head.appendChild(this.styleEl);

    kernel.slots.registerSlotItem('slot:toolbar', 'neon-indicator', () => {
      const tag = document.createElement('span');
      tag.className = 'neon-theme-badge';
      tag.textContent = 'НЕОН МОД';
      return tag;
    });
  }

  async onKernelShutdown(): Promise<void> {
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
  }
}

const neonThemeManifest: PluginManifest = {
  id: 'com.harek.demo.neon-theme',
  name: 'Неоновая тема ядра',
  version: '1.0.0',
  author: 'Harek Core Team',
  description: 'Системное расширение ядра (core-extension), модифицирующее стили, слоты и палитру всей платформы.',
  type: 'core-extension',
  entry: 'NeonTheme.js',
  permissions: ['kernel:internal']
};

export interface SamplePluginItem {
  manifest: PluginManifest;
  factory: () => HarekPlugin;
}

export const samplePlugins: SamplePluginItem[] = [
  { manifest: clockManifest, factory: () => new ClockWidgetPlugin() },
  { manifest: busMonitorManifest, factory: () => new EventBusMonitorPlugin() },
  { manifest: neonThemeManifest, factory: () => new NeonThemeExtension() }
];
