import { Kernel } from '../kernel/Kernel.js';
import { Logger } from '../kernel/Logger.js';

export class InspectorModal {
  readonly element: HTMLElement;
  private currentTab = 'logs';

  constructor(private kernel: Kernel) {
    this.element = this.createDOM();
    this.bindEvents();
  }

  private createDOM(): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'harek-modal-backdrop is-hidden';

    const modal = document.createElement('div');
    modal.className = 'harek-modal harek-inspector-modal';

    const header = document.createElement('div');
    header.className = 'harek-modal-header';

    const title = document.createElement('h2');
    title.className = 'harek-modal-title';
    title.textContent = 'Инспектор микроядра Harek';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'harek-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const nav = document.createElement('div');
    nav.className = 'harek-inspector-nav';

    const tabs = [
      { id: 'logs', label: 'Журнал логов' },
      { id: 'services', label: 'Сервисы ядра' },
      { id: 'hooks', label: 'Хуки и перехваты' },
      { id: 'events', label: 'События шины' },
      { id: 'plugins', label: 'Активные модули' }
    ];

    for (const tab of tabs) {
      const tabBtn = document.createElement('button');
      tabBtn.className = `harek-inspector-tab-btn ${tab.id === this.currentTab ? 'is-active' : ''}`;
      tabBtn.dataset.tab = tab.id;
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener('click', () => {
        nav.querySelectorAll('.harek-inspector-tab-btn').forEach((b) => b.classList.remove('is-active'));
        tabBtn.classList.add('is-active');
        this.currentTab = tab.id;
        this.renderTabContent();
      });
      nav.appendChild(tabBtn);
    }

    const contentArea = document.createElement('div');
    contentArea.className = 'harek-inspector-content';
    contentArea.id = 'harek-inspector-body';

    modal.appendChild(header);
    modal.appendChild(nav);
    modal.appendChild(contentArea);
    backdrop.appendChild(modal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    return backdrop;
  }

  private bindEvents(): void {
    this.kernel.events.on('kernel:log', () => {
      if (!this.element.classList.contains('is-hidden') && this.currentTab === 'logs') {
        this.renderTabContent();
      }
    });
  }

  open(): void {
    this.element.classList.remove('is-hidden');
    this.renderTabContent();
  }

  close(): void {
    this.element.classList.add('is-hidden');
  }

  private renderTabContent(): void {
    const container = this.element.querySelector('#harek-inspector-body');
    if (!container) return;
    container.innerHTML = '';

    if (this.currentTab === 'logs') {
      const logs = Logger.getHistory();
      const list = document.createElement('div');
      list.className = 'harek-log-list';

      if (logs.length === 0) {
        list.innerHTML = '<div class="empty-state">Журнал логов пуст</div>';
      } else {
        for (const log of logs) {
          const row = document.createElement('div');
          row.className = `harek-log-item log-${log.level}`;
          row.innerHTML = `
            <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
            <span class="log-scope">[${log.scope}]</span>
            <span class="log-level">[${log.level.toUpperCase()}]</span>
            <span class="log-msg">${this.escape(log.message)}</span>
          `;
          list.appendChild(row);
        }
      }
      container.appendChild(list);
    } else if (this.currentTab === 'services') {
      const keys = this.kernel.services.getAllKeys();
      const table = document.createElement('table');
      table.className = 'harek-inspector-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Идентификатор сервиса</th>
            <th>Тип реализации</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${keys.map((k) => `
            <tr>
              <td><code>${String(k)}</code></td>
              <td>${typeof this.kernel.services.get(k)}</td>
              <td><span class="badge-success">Зарегистрирован</span></td>
            </tr>
          `).join('')}
        </tbody>
      `;
      container.appendChild(table);
    } else if (this.currentTab === 'hooks') {
      const hooks = this.kernel.hooks.getAllHookNames();
      const table = document.createElement('table');
      table.className = 'harek-inspector-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Имя точки перехвата</th>
            <th>Количество слушателей</th>
          </tr>
        </thead>
        <tbody>
          ${hooks.map((h) => `
            <tr>
              <td><code>${h}</code></td>
              <td>${(this.kernel.hooks.get(h) as any).getTappedNames ? (this.kernel.hooks.get(h) as any).getTappedNames().length : 0}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      container.appendChild(table);
    } else if (this.currentTab === 'events') {
      const events = this.kernel.events.getHistory();
      const table = document.createElement('table');
      table.className = 'harek-inspector-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Время</th>
            <th>Имя события</th>
            <th>Полезная нагрузка</th>
          </tr>
        </thead>
        <tbody>
          ${events.map((e) => `
            <tr>
              <td>${new Date(e.timestamp).toLocaleTimeString()}</td>
              <td><code>${e.event}</code></td>
              <td><pre>${this.escape(JSON.stringify(e.payload, null, 2))}</pre></td>
            </tr>
          `).join('')}
        </tbody>
      `;
      container.appendChild(table);
    } else if (this.currentTab === 'plugins') {
      const plugins = this.kernel.installedPlugins;
      const table = document.createElement('table');
      table.className = 'harek-inspector-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>ID плагина</th>
            <th>Название</th>
            <th>Версия</th>
            <th>Тип</th>
            <th>Разрешения</th>
          </tr>
        </thead>
        <tbody>
          ${plugins.map((p) => `
            <tr>
              <td><code>${p.id}</code></td>
              <td>${p.name}</td>
              <td>${p.version}</td>
              <td><span class="badge-type">${p.type}</span></td>
              <td>${p.permissions ? p.permissions.join(', ') : 'Нет'}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      container.appendChild(table);
    }
  }

  private escape(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
