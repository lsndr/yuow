import type { RunOptions } from './uow';
import { UowContext } from './uow-context';

export type TransactionalOptions<TO> = RunOptions<TO>;

export const Transactional = <TO = any>(
  options?: TransactionalOptions<TO>,
): MethodDecorator => {
  return (
    _target: any,
    _propertyKey: any,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const action = descriptor.value as (...args: any[]) => unknown;

    descriptor.value = async (...args: any[]) => {
      const uow = UowContext.uow();

      return uow.run(() => {
        return action(...args);
      }, options);
    };
  };
};
