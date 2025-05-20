import { faker } from '@faker-js/faker';
import { Uow } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { RepositoryMock } from './utils/repository.mock';
import { TransactionMock } from './utils/transaction.mock';
import 'jest-extended';

describe('Core – Context', () => {
  let engineMock: EngineMock;
  let transactionMock: TransactionMock;
  let uow: Uow<EngineMock>;

  beforeEach(() => {
    transactionMock = new TransactionMock();
    engineMock = new EngineMock(transactionMock);

    uow = new Uow(engineMock);
  });

  it('should emit flush events', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };
    const onBeforeFlush = jest.fn();
    const onAfterFlush = jest.fn();
    uow.on('beforeRun', ({ context }) => {
      context.on('beforeFlush', onBeforeFlush);
      context.on('afterFlush', onAfterFlush);
    });

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);

      repositoryMock.doInsert.mockResolvedValue(true);
      repositoryMock.extractIdentity.mockResolvedValue(entity.id);

      repositoryMock.add(entity);

      return repositoryMock;
    });

    // assert
    expect(onBeforeFlush).toHaveBeenCalledExactlyOnceWith(repository);
    expect(onAfterFlush).toHaveBeenCalledExactlyOnceWith(repository);

    expect(onBeforeFlush).toHaveBeenCalledBefore(onAfterFlush);
  });

  it('should not emit flush events if unsubscribed', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };
    const onBeforeFlush = jest.fn();
    const onAfterFlush = jest.fn();
    uow.on('beforeRun', ({ context }) => {
      context.on('beforeFlush', onBeforeFlush);
      context.on('afterFlush', onAfterFlush);
      context.off('beforeFlush', onBeforeFlush);
      context.off('afterFlush', onAfterFlush);
    });

    // act
    await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);

      repositoryMock.doInsert.mockResolvedValue(true);
      repositoryMock.extractIdentity.mockResolvedValue(entity.id);

      repositoryMock.add(entity);

      return repositoryMock;
    });

    // assert
    expect(onBeforeFlush).not.toHaveBeenCalled();
    expect(onAfterFlush).not.toHaveBeenCalled();
  });
});
