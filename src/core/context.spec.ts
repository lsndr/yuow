import { Context } from './context';
import { TransactionMock } from '../../tests/utils/transaction.mock';
import {
  type RepositoryMockConstructor,
  createRepositoryMock,
} from '../../tests/utils/repository.mock';
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

  describe('flush', () => {
    it('should flush changes in all initialized repositories', async () => {
      // arrange
      const repository1 = context.getRepository(RepositoryMock1);
      const repository2 = context.getRepository(RepositoryMock2);

      RepositoryMock1.doInsert.mockResolvedValue(true);
      RepositoryMock2.doInsert.mockResolvedValue(true);

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
      expect(RepositoryMock1.doInsert).toHaveBeenCalledExactlyOnceWith(entity1);
      expect(RepositoryMock2.doInsert).toHaveBeenCalledExactlyOnceWith(entity2);
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
});
