import { Context } from './context';
import { ContextProvider } from './context-provider';
import {
  type RepositoryMockConstructor,
  createRepositoryMock,
} from '../../tests/utils/repository.mock';
import { TransactionMock } from '../../tests/utils/transaction.mock';
import { faker } from '@faker-js/faker';
import 'jest-extended';

describe(Context, () => {
  let context: Context<TransactionMock>;
  let transaction: TransactionMock;
  let RepositoryMock1: RepositoryMockConstructor;
  let RepositoryMock2: RepositoryMockConstructor;

  beforeEach(() => {
    transaction = new TransactionMock();
    context = new Context(transaction);

    RepositoryMock1 = createRepositoryMock();
    RepositoryMock2 = createRepositoryMock();
  });

  describe('self.getRepository', () => {
    it('should return a new repository instance', () => {
      // act
      const repository = ContextProvider.create(context, () =>
        Context.getRepository(RepositoryMock1),
      );

      // assert
      expect(repository).toBeInstanceOf(RepositoryMock1);
    });
  });

  describe('getRepository', () => {
    it('should return a new repository instance', () => {
      // act
      const repository = context.getRepository(RepositoryMock1);

      // assert
      expect(repository).toBeInstanceOf(RepositoryMock1);
    });

    it('should return the same repository instance if called 2 times', () => {
      // act
      const repository1 = context.getRepository(RepositoryMock1);
      const repository2 = context.getRepository(RepositoryMock1);

      // assert
      expect(repository1).toBe(repository2);
    });
  });

  describe('self.flush', () => {
    it('should flush changes', async () => {
      // arrange
      const repository = context.getRepository(RepositoryMock1);

      RepositoryMock1.flushInsert.mockResolvedValue(true);

      const entity = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };

      repository.add(entity);

      // act
      await ContextProvider.create(context, () => Context.flush());

      // assert
      expect(RepositoryMock1.flushInsert).toHaveBeenCalledExactlyOnceWith(
        entity,
      );
    });
  });

  describe('flush', () => {
    it('should flush changes in all initialized repositories', async () => {
      // arrange
      const repository1 = context.getRepository(RepositoryMock1);
      const repository2 = context.getRepository(RepositoryMock2);

      RepositoryMock1.flushInsert.mockResolvedValue(true);
      RepositoryMock2.flushInsert.mockResolvedValue(true);

      const entity1 = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      const entity2 = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };

      repository1.add(entity1);
      repository2.add(entity2);

      // act
      await context.flush();

      // assert
      expect(RepositoryMock1.flushInsert).toHaveBeenCalledExactlyOnceWith(
        entity1,
      );
      expect(RepositoryMock2.flushInsert).toHaveBeenCalledExactlyOnceWith(
        entity2,
      );
    });

    it('should emit beforeFlush and afterFlush events', async () => {
      // arrange
      const beforeFlush = jest.fn();
      const afterFlush = jest.fn();
      context.on('beforeFlush', beforeFlush);
      context.on('afterFlush', afterFlush);

      // act
      await context.flush();

      // assert
      expect(beforeFlush).toHaveBeenCalledTimes(1);
      expect(afterFlush).toHaveBeenCalledTimes(1);
      expect(beforeFlush).toHaveBeenCalledBefore(afterFlush);
    });
  });

  describe('self.get', () => {
    it('should return the current context', () => {
      // act
      const currentContext = ContextProvider.create(context, () =>
        Context.get(),
      );

      // assert
      expect(currentContext).toBe(context);
    });
  });
});
