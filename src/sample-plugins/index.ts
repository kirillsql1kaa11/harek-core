import {
  PluginManifest,
  IWidgetPlugin,
  IWidgetContext,
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
        <div class="clock-uptime" id="clock-uptime">Аптайм: 0 сек</div>
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
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      if (this.uptimeEl) {
        const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.uptimeEl.textContent = `Аптайм: ${uptimeSeconds} сек`;
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
  name: 'Системное время',
  version: '1.0.0',
  author: 'Harek Team',
  description: 'Минималистичный таймер реального времени с отправкой событий тика в шину ядра.',
  type: 'board-widget',
  entry: 'ClockWidget.js',
  permissions: ['storage:local'],
  defaultSize: {
    width: 280,
    height: 160,
    minWidth: 240,
    minHeight: 130
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
          <span>События шины</span>
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

    if (this.listEl.children.length > 20) {
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
  author: 'Harek Team',
  description: 'Лаконичный монитор трафика событий шины ядра.',
  type: 'board-widget',
  entry: 'EventBusMonitor.js',
  defaultSize: {
    width: 320,
    height: 220,
    minWidth: 280,
    minHeight: 180
  }
};

export interface SamplePluginItem {
  manifest: PluginManifest;
  factory: () => HarekPlugin;
}

export const samplePlugins: SamplePluginItem[] = [
  { manifest: clockManifest, factory: () => new ClockWidgetPlugin() },
  { manifest: busMonitorManifest, factory: () => new EventBusMonitorPlugin() }
];
