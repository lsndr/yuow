export class WeakVersionTracker<E extends object> {
  private readonly map = new WeakMap<E, number>();

  public setVersion(entity: E, version: number) {
    const currentVersion = this.getVersion(entity);

    if (version < currentVersion) {
      throw new Error('Version cannot be decreased');
    }

    this.map.set(entity, version);
  }

  public increaseVersion(entity: E): number {
    const currentVersion = this.map.get(entity) ?? 0;
    const version = currentVersion + 1;

    this.map.set(entity, version);

    return version;
  }

  public getVersion(entity: E) {
    return this.map.get(entity) ?? 1;
  }
}
