export class ObjectOperator {
  constructor(public readonly object: object) {}

  extract(path: string) {
    const keys = path.split('.');

    return keys.reduce<unknown>((value, key) => {
      return (value as any)[key];
    }, this.object);
  }

  put(path: string, value: unknown) {
    const keys = path.split('.');
    let dataObject = this.object;

    while (keys.length > 0) {
      const key = keys.shift();

      if (typeof key === 'undefined') {
        throw new Error('Unexpectedly exhausted the stack');
      }

      if (keys.length === 0) {
        (dataObject as any)[key] = value;
      } else {
        if (!(key in dataObject)) {
          (dataObject as any)[key] = {};
        }

        dataObject = (dataObject as any)[key];
      }
    }
  }
}
