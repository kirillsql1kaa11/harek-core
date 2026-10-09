import { Kernel } from './kernel/Kernel.js';
import { BoardCanvas } from './board/BoardCanvas.js';
import { Toolbar } from './ui/Toolbar.js';
import { InspectorModal } from './ui/InspectorModal.js';
import { PluginCatalogModal } from './ui/PluginCatalogModal.js';
import { samplePlugins } from './sample-plugins/index.js';

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) return;

  const kernel = new Kernel();
  const board = new BoardCanvas(kernel);

  kernel.plugins.setMountHandler((id, manifest, content, bounds, onClose) => {
    board.mountWidget(id, manifest, content, bounds, onClose);
  });

  const inspectorModal = new InspectorModal(kernel);
  const catalogModal = new PluginCatalogModal(kernel);

  const toolbar = new Toolbar(
    kernel,
    () => catalogModal.open(),
    () => inspectorModal.open(),
    () => board.clearBoard()
  );

  app.appendChild(toolbar.element);
  app.appendChild(board.element);
  document.body.appendChild(inspectorModal.element);
  document.body.appendChild(catalogModal.element);

  await kernel.boot();

  const clockPlugin = samplePlugins[0];
  if (clockPlugin) {
    await kernel.plugins.installFromSource(clockPlugin.manifest, clockPlugin.factory, { x: 80, y: 80 });
  }

  const busMonitor = samplePlugins[1];
  if (busMonitor) {
    await kernel.plugins.installFromSource(busMonitor.manifest, busMonitor.factory, { x: 440, y: 80 });
  }

  kernel.logger.info('Рабочее пространство доски Harek Core успешно инициализировано');
}

bootstrap().catch((err) => {
  console.error('Критическая ошибка инициализации Harek Core:', err);
});
