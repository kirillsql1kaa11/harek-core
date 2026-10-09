import { Kernel } from '../kernel/Kernel.js';
import { Logger } from '../kernel/Logger.js';

export class InspectorModal {
  readonly element: HTMLElement;
  private currentTab = 'plugins';

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
    title.textContent = 'Управление ядром и модулями';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'harek-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const nav = document.createElement('div');
    nav.className = 'harek-inspector-nav';

    const tabs = [
      { id: 'plugins', label: 'Установленные модули' },
      { id: 'logs', label: 'Журнал логов' },
      { id: 'services', label: 'Сервисы ядра' },
      { id: 'hooks', label: 'Хуки' },
      { id: 'events', label: 'События шины' }
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

    this.kernel.events.on('plugin:installed', () => {
      if (!this.element.classList.contains('is-hidden') && this.currentTab === 'plugins') {
        this.renderTabContent();
      }
    });

    this.kernel.events.on('plugin:uninstalled', () => {
      if (!this.element.classList.contains('is-hidden') && this.currentTab === 'plugins') {
        this.renderTabContent();
      }
    });

    this.kernel.events.on('plugin:state-changed', () => {
      if (!this.element.classList.contains('is-hidden') && this.currentTab === 'plugins') {
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

    if (this.currentTab === 'plugins') {
      const plugins = this.kernel.installedPlugins;
      if (plugins.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет установленных модулей</div>';
        return;
      }

      const list = document.createElement('div');
      list.className = 'harek-plugin-manager-list';

      for (const p of plugins) {
        const isEnabled = this.kernel.plugins.isPluginEnabled(p.id);
        const card = document.createElement('div');
        card.className = `harek-plugin-manager-card ${isEnabled ? 'is-enabled' : 'is-disabled'}`;

        card.innerHTML = `
          <div class="plugin-mgr-info">
            <div class="plugin-mgr-header">
              <span class="plugin-mgr-title">${p.name}</span>
              <span class="plugin-mgr-version">v${p.version}</span>
              <span class="badge-type">${p.type}</span>
              <span class="plugin-status-badge ${isEnabled ? 'status-on' : 'status-off'}">
                ${isEnabled ? 'Активен' : 'Отключен'}
              </span>
            </div>
            <div class="plugin-mgr-id"><code>${p.id}</code></div>
            <div class="plugin-mgr-desc">${p.description || 'Модуль расширения Harek'}</div>
          </div>
          <div class="plugin-mgr-actions">
            <button class="harek-btn ${isEnabled ? 'harek-btn-secondary' : 'harek-btn-primary'} toggle-btn" data-id="${p.id}">
              ${isEnabled ? 'Отключить' : 'Включить'}
            </button>
            <button class="harek-btn harek-btn-danger delete-btn" data-id="${p.id}">
              Удалить
            </button>
          </div>
        `;

        const toggleBtn = card.querySelector('.toggle-btn') as HTMLButtonElement;
        toggleBtn.addEventListener('click', async () => {
          await this.kernel.plugins.togglePlugin(p.id);
          this.renderTabContent();
        });

        const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
        deleteBtn.addEventListener('click', async () => {
          await this.kernel.plugins.uninstallPlugin(p.id);
          this.renderTabContent();
        });

        list.appendChild(card);
      }
      container.appendChild(list);
    } else if (this.currentTab === 'logs') {
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
            <th>Сервис</th>
            <th>Тип</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${keys.map((k) => `
            <tr>
              <td><code>${String(k)}</code></td>
              <td>${typeof this.kernel.services.get(k)}</td>
              <td><span class="badge-success">Активен</span></td>
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
            <th>Точка перехвата</th>
            <th>Слушатели</th>
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
    }
  }

  private escape(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
