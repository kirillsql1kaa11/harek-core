import { IHook, IHookRegistry, HookHandler } from 'harek-sdk';

export class Hook<TContext = unknown, TArgs = unknown> implements IHook<TContext, TArgs> {
  private handlers: Map<string, HookHandler<TContext, TArgs>> = new Map();

  tap(name: string, handler: HookHandler<TContext, TArgs>): void {
    this.handlers.set(name, handler);
  }

  untap(name: string): boolean {
    return this.handlers.delete(name);
  }

  async call(context: TContext, args: TArgs): Promise<void> {
    for (const [name, handler] of Array.from(this.handlers.entries())) {
      try {
        await handler(context, args);
      } catch (error) {
        console.error(`Ошибка при выполнении хука '${name}':`, error);
        throw error;
      }
    }
  }

  getTappedNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export class HookRegistry implements IHookRegistry {
  private hooks: Map<string, Hook<any, any>> = new Map();

  constructor() {
    this.register('beforePluginLoad');
    this.register('afterPluginLoad');
    this.register('beforePluginUnload');
    this.register('onKernelReady');
    this.register('onKernelShutdown');
  }

  get<TContext, TArgs>(name: string): IHook<TContext, TArgs> {
    const hook = this.hooks.get(name);
    if (!hook) {
      return this.register<TContext, TArgs>(name);
    }
    return hook as IHook<TContext, TArgs>;
  }

  register<TContext, TArgs>(name: string): IHook<TContext, TArgs> {
    if (this.hooks.has(name)) {
      return this.hooks.get(name)! as IHook<TContext, TArgs>;
    }
    const hook = new Hook<TContext, TArgs>();
    this.hooks.set(name, hook);
    return hook;
  }

  getAllHookNames(): string[] {
    return Array.from(this.hooks.keys());
  }
}
