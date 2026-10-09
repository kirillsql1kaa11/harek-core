import { IServiceRegistry, ServiceIdentifier, ServiceNotFoundError } from 'harek-sdk';

export class ServiceRegistry implements IServiceRegistry {
  private services: Map<string | symbol, unknown> = new Map();

  private getKey(id: ServiceIdentifier<unknown>): string | symbol {
    return typeof id === 'object' && id !== null && 'id' in id ? id.id : id;
  }

  register<T>(id: ServiceIdentifier<T>, implementation: T): void {
    const key = this.getKey(id);
    if (this.services.has(key)) {
      throw new Error(`Сервис '${String(key)}' уже зарегистрирован. Используйте override для замены.`);
    }
    this.services.set(key, implementation);
  }

  get<T>(id: ServiceIdentifier<T>): T {
    const key = this.getKey(id);
    const service = this.services.get(key);
    if (service === undefined) {
      throw new ServiceNotFoundError(key);
    }
    return service as T;
  }

  has(id: ServiceIdentifier<unknown>): boolean {
    const key = this.getKey(id);
    return this.services.has(key);
  }

  override<T>(id: ServiceIdentifier<T>, implementation: T): void {
    const key = this.getKey(id);
    this.services.set(key, implementation);
  }

  unregister(id: ServiceIdentifier<unknown>): boolean {
    const key = this.getKey(id);
    return this.services.delete(key);
  }

  getAllKeys(): Array<string | symbol> {
    return Array.from(this.services.keys());
  }
}
