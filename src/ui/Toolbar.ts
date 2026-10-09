import { Kernel } from '../kernel/Kernel.js';

export class Toolbar {
  readonly element: HTMLElement;
  private pluginsCountEl!: HTMLElement;
  private servicesCountEl!: HTMLElement;
  private eventsCountEl!: HTMLElement;

  constructor(
    private kernel: Kernel,
    private onOpenCatalog: () => void,
    private onOpenInspector: () => void,
    private onClearBoard: () => void
  ) {
    this.element = this.createDOM();
    this.bindEvents();
    this.updateStats();
  }

  private createDOM(): HTMLElement {
    const bar = document.createElement('header');
    bar.id = 'harek-toolbar';
    bar.className = 'harek-toolbar';

    const brandSection = document.createElement('div');
    brandSection.className = 'harek-toolbar-brand-section';

    const logo = document.createElement('div');
    logo.className = 'harek-toolbar-logo';
    logo.textContent = 'HAREK';

    const versionTag = document.createElement('span');
    versionTag.className = 'harek-toolbar-core-tag';
    versionTag.textContent = 'CORE 0.1';

    const statusPill = document.createElement('div');
    statusPill.className = 'harek-toolbar-status-pill';
    statusPill.innerHTML = '<span class="status-indicator"></span><span class="status-text">ЯДРО АКТИВНО</span>';

    brandSection.appendChild(logo);
    brandSection.appendChild(versionTag);
    brandSection.appendChild(statusPill);

    const statsSection = document.createElement('div');
    statsSection.className = 'harek-toolbar-stats';

    this.pluginsCountEl = document.createElement('span');
    this.pluginsCountEl.className = 'stat-chip';

    this.servicesCountEl = document.createElement('span');
    this.servicesCountEl.className = 'stat-chip';

    this.eventsCountEl = document.createElement('span');
    this.eventsCountEl.className = 'stat-chip';

    statsSection.appendChild(this.pluginsCountEl);
    statsSection.appendChild(this.servicesCountEl);
    statsSection.appendChild(this.eventsCountEl);

    const actionsSection = document.createElement('div');
    actionsSection.className = 'harek-toolbar-actions';

    const catalogBtn = document.createElement('button');
    catalogBtn.className = 'harek-btn harek-btn-primary';
    catalogBtn.textContent = 'Каталог плагинов';
    catalogBtn.addEventListener('click', () => this.onOpenCatalog());

    const inspectorBtn = document.createElement('button');
    inspectorBtn.className = 'harek-btn harek-btn-secondary';
    inspectorBtn.textContent = 'Инспектор ядра';
    inspectorBtn.addEventListener('click', () => this.onOpenInspector());

    const clearBtn = document.createElement('button');
    clearBtn.className = 'harek-btn harek-btn-outline';
    clearBtn.textContent = 'Очистить доску';
    clearBtn.addEventListener('click', () => this.onClearBoard());

    actionsSection.appendChild(catalogBtn);
    actionsSection.appendChild(inspectorBtn);
    actionsSection.appendChild(clearBtn);

    bar.appendChild(brandSection);
    bar.appendChild(statsSection);
    bar.appendChild(actionsSection);

    return bar;
  }

  private bindEvents(): void {
    this.kernel.events.on('plugin:installed', () => this.updateStats());
    this.kernel.events.on('plugin:uninstalled', () => this.updateStats());
    this.kernel.events.on('kernel:ready', () => this.updateStats());
  }

  updateStats(): void {
    const pluginsCount = this.kernel.installedPlugins.length;
    const servicesCount = this.kernel.services.getAllKeys().length;
    const eventsHistory = this.kernel.events.getHistory().length;

    this.pluginsCountEl.textContent = `Плагины: ${pluginsCount}`;
    this.servicesCountEl.textContent = `Сервисы: ${servicesCount}`;
    this.eventsCountEl.textContent = `События: ${eventsHistory}`;
  }
}
