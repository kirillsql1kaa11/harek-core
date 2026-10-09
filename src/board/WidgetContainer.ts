import { PluginManifest, WidgetBounds } from 'harek-sdk';

export interface WidgetContainerOptions {
  id: string;
  manifest: PluginManifest;
  content: HTMLElement;
  bounds: WidgetBounds;
  onBoundsChange: (bounds: WidgetBounds) => void;
  onToggleEnabled: () => void;
  onClose: () => void;
  onFocus: () => void;
}

export class WidgetContainer {
  readonly element: HTMLElement;
  private bounds: WidgetBounds;
  private isDragging = false;
  private isResizing = false;
  private startX = 0;
  private startY = 0;
  private initialX = 0;
  private initialY = 0;
  private initialWidth = 0;
  private initialHeight = 0;

  constructor(private options: WidgetContainerOptions) {
    this.bounds = { ...options.bounds };
    this.element = this.createDOM();
    this.updatePosition();
    this.bindEvents();
  }

  private createDOM(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'harek-widget-card';
    card.dataset.widgetId = this.options.id;

    const header = document.createElement('div');
    header.className = 'harek-widget-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'harek-widget-title-group';

    const dot = document.createElement('span');
    dot.className = 'harek-widget-status-dot';

    const title = document.createElement('span');
    title.className = 'harek-widget-title';
    title.textContent = this.options.manifest.name;

    const badge = document.createElement('span');
    badge.className = 'harek-widget-badge';
    badge.textContent = `v${this.options.manifest.version}`;

    titleGroup.appendChild(dot);
    titleGroup.appendChild(title);
    titleGroup.appendChild(badge);

    const controls = document.createElement('div');
    controls.className = 'harek-widget-controls';

    const powerBtn = document.createElement('button');
    powerBtn.className = 'harek-widget-btn harek-widget-power-btn';
    powerBtn.title = 'Отключить плагин';
    powerBtn.innerHTML = '&#9210;';
    powerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onToggleEnabled();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'harek-widget-btn harek-widget-close-btn';
    closeBtn.title = 'Удалить плагин';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.options.onClose();
    });

    controls.appendChild(powerBtn);
    controls.appendChild(closeBtn);
    header.appendChild(titleGroup);
    header.appendChild(controls);

    const body = document.createElement('div');
    body.className = 'harek-widget-body';
    body.appendChild(this.options.content);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'harek-widget-resize-handle';
    resizeHandle.title = 'Изменить размер';

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(resizeHandle);

    return card;
  }

  private updatePosition(): void {
    this.element.style.transform = `translate3d(${this.bounds.x}px, ${this.bounds.y}px, 0)`;
    this.element.style.width = `${this.bounds.width}px`;
    this.element.style.height = `${this.bounds.height}px`;
  }

  private bindEvents(): void {
    const header = this.element.querySelector('.harek-widget-header') as HTMLElement;
    const resizeHandle = this.element.querySelector('.harek-widget-resize-handle') as HTMLElement;

    this.element.addEventListener('pointerdown', () => {
      this.options.onFocus();
    });

    header.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialX = this.bounds.x;
      this.initialY = this.bounds.y;
      header.setPointerCapture(e.pointerId);
      this.element.classList.add('is-dragging');
    });

    header.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.bounds.x = Math.max(0, this.initialX + dx);
      this.bounds.y = Math.max(0, this.initialY + dy);
      this.updatePosition();
      this.options.onBoundsChange({ ...this.bounds });
    });

    const stopDragging = (e: PointerEvent) => {
      if (this.isDragging) {
        this.isDragging = false;
        header.releasePointerCapture(e.pointerId);
        this.element.classList.remove('is-dragging');
      }
    };
    header.addEventListener('pointerup', stopDragging);
    header.addEventListener('pointercancel', stopDragging);

    resizeHandle.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      this.isResizing = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialWidth = this.bounds.width;
      this.initialHeight = this.bounds.height;
      resizeHandle.setPointerCapture(e.pointerId);
      this.element.classList.add('is-resizing');
    });

    resizeHandle.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isResizing) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      const minWidth = this.options.manifest.defaultSize?.minWidth || 200;
      const minHeight = this.options.manifest.defaultSize?.minHeight || 140;
      this.bounds.width = Math.max(minWidth, this.initialWidth + dx);
      this.bounds.height = Math.max(minHeight, this.initialHeight + dy);
      this.updatePosition();
      this.options.onBoundsChange({ ...this.bounds });
    });

    const stopResizing = (e: PointerEvent) => {
      if (this.isResizing) {
        this.isResizing = false;
        resizeHandle.releasePointerCapture(e.pointerId);
        this.element.classList.remove('is-resizing');
      }
    };
    resizeHandle.addEventListener('pointerup', stopResizing);
    resizeHandle.addEventListener('pointercancel', stopResizing);
  }

  setZIndex(index: number): void {
    this.element.style.zIndex = index.toString();
  }
}
