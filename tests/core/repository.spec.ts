import { faker } from '@faker-js/faker';
import { ChangeTracker, Uow } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { RepositoryMock } from './utils/repository.mock';
import { TransactionMock } from './utils/transaction.mock';
import 'jest-extended';

describe('Core – Repository', () => {
  let engineMock: EngineMock;
  let transactionMock: TransactionMock;
  let uow: Uow<EngineMock>;

  beforeEach(async () => {
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
      context.on('beforeFlush', (repository) => {
        repository.on('beforeFlsuh', onBeforeFlush);
        repository.on('afterFlush', onAfterFlush);
      });
    });

    // act
    await uow.run((ctx) => {
      const repository = ctx.getRepository(RepositoryMock);

      repository.doInsert.mockResolvedValue(true);
      repository.extractIdentity.mockResolvedValue(entity.id);

      repository.add(entity);
    });

    // assert
    expect(onBeforeFlush).toHaveBeenCalledExactlyOnceWith(
      expect.any(ChangeTracker),
    );
    expect(onAfterFlush).toHaveBeenCalledExactlyOnceWith(
      expect.any(ChangeTracker),
    );

    expect(onBeforeFlush).toHaveBeenCalledBefore(onAfterFlush);
  });

  it('should not emit flush events if unsubscribed', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };
    const onBeforeFlush = jest.fn();
    const onAfterFlush = jest.fn();
    uow.on('beforeRun', ({ context }) => {
      context.on('beforeFlush', (repository) => {
        repository.on('beforeFlsuh', onBeforeFlush);
        repository.on('afterFlush', onAfterFlush);
        repository.off('beforeFlsuh', onBeforeFlush);
        repository.off('afterFlush', onAfterFlush);
      });
    });

    // act
    await uow.run((ctx) => {
      const repository = ctx.getRepository(RepositoryMock);

      repository.doInsert.mockResolvedValue(true);
      repository.extractIdentity.mockResolvedValue(entity.id);

      repository.add(entity);
    });

    // assert
    expect(onBeforeFlush).not.toHaveBeenCalled();
    expect(onAfterFlush).not.toHaveBeenCalled();
  });
});
