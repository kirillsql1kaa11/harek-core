import { Kernel } from '../kernel/Kernel.js';
import { samplePlugins } from '../sample-plugins/index.js';

export class PluginCatalogModal {
  readonly element: HTMLElement;

  constructor(private kernel: Kernel) {
    this.element = this.createDOM();
  }

  private createDOM(): HTMLElement {
    const backdrop = document.createElement('div');
    backdrop.className = 'harek-modal-backdrop is-hidden';

    const modal = document.createElement('div');
    modal.className = 'harek-modal harek-catalog-modal';

    const header = document.createElement('div');
    header.className = 'harek-modal-header';

    const title = document.createElement('h2');
    title.className = 'harek-modal-title';
    title.textContent = 'Каталог демонстрационных модулей Harek';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'harek-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'harek-catalog-grid';

    for (const item of samplePlugins) {
      const card = document.createElement('div');
      card.className = 'harek-catalog-card';

      const typeBadgeClass = item.manifest.type === 'core-extension' ? 'badge-extension' : 'badge-widget';
      const typeLabel = item.manifest.type === 'core-extension' ? 'Системное расширение ядра' : 'Виджет доски';

      card.innerHTML = `
        <div class="catalog-card-header">
          <span class="badge-type ${typeBadgeClass}">${typeLabel}</span>
          <span class="catalog-version">v${item.manifest.version}</span>
        </div>
        <h3 class="catalog-card-title">${item.manifest.name}</h3>
        <p class="catalog-card-desc">${item.manifest.description || ''}</p>
        <div class="catalog-card-meta">
          <span>Автор: ${item.manifest.author}</span>
          <span>ID: <code>${item.manifest.id}</code></span>
        </div>
        <div class="catalog-card-actions">
          <button class="harek-btn harek-btn-primary install-btn" data-id="${item.manifest.id}">
            Установить в ядро
          </button>
        </div>
      `;

      const btn = card.querySelector('.install-btn') as HTMLButtonElement;
      btn.addEventListener('click', async () => {
        try {
          await this.kernel.plugins.installFromSource(item.manifest, item.factory);
          btn.textContent = 'Установлен';
          btn.disabled = true;
          this.kernel.logger.info(`Модуль '${item.manifest.name}' установлен через каталог`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          alert(`Ошибка установки: ${msg}`);
        }
      });

      list.appendChild(card);
    }

    modal.appendChild(header);
    modal.appendChild(list);
    backdrop.appendChild(modal);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    return backdrop;
  }

  open(): void {
    this.element.classList.remove('is-hidden');
    this.updateButtonsState();
  }

  close(): void {
    this.element.classList.add('is-hidden');
  }

  private updateButtonsState(): void {
    const installedIds = new Set(this.kernel.installedPlugins.map((p) => p.id));
    const buttons = this.element.querySelectorAll<HTMLButtonElement>('.install-btn');
    buttons.forEach((btn) => {
      const id = btn.dataset.id;
      if (id && installedIds.has(id)) {
        btn.textContent = 'Установлен';
        btn.disabled = true;
      } else {
        btn.textContent = 'Установить в ядро';
        btn.disabled = false;
      }
    });
  }
}
