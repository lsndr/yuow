import { faker } from '@faker-js/faker';
import { ChangeTracker, EntityState, Uow } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { RepositoryMock } from './utils/repository.mock';
import { TransactionMock } from './utils/transaction.mock';
import 'jest-extended';

describe('Core – Repository', () => {
  let engineMock: EngineMock;
  let transactionMock: TransactionMock;
  let uow: Uow<EngineMock>;

  beforeEach(() => {
    transactionMock = new TransactionMock();
    engineMock = new EngineMock(transactionMock);

    uow = new Uow(engineMock);
  });

  it('should not delete existing entity if it is added back to repository', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);
      repositoryMock.track(entity, EntityState.LOADED);

      repositoryMock.delete(entity);
      repositoryMock.add(entity);

      return repositoryMock;
    });

    // assert
    expect(repository.doDelete).not.toHaveBeenCalled();
    expect(repository.doInsert).not.toHaveBeenCalled();
    expect(repository.doUpdate).not.toHaveBeenCalled();
  });

  it('should persist deleted new entity if it is added back to repository', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);

      repositoryMock.doInsert.mockResolvedValue(true);

      repositoryMock.add(entity);
      repositoryMock.delete(entity);
      repositoryMock.add(entity);

      return repositoryMock;
    });

    // assert
    expect(repository.doInsert).toHaveBeenCalledExactlyOnceWith(entity);
    expect(repository.doDelete).not.toHaveBeenCalled();
    expect(repository.doUpdate).not.toHaveBeenCalled();
  });

  it('should not persist deleted new entity', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);

      repositoryMock.add(entity);
      repositoryMock.delete(entity);

      return repositoryMock;
    });

    // assert
    expect(repository.doDelete).not.toHaveBeenCalled();
    expect(repository.doInsert).not.toHaveBeenCalled();
    expect(repository.doUpdate).not.toHaveBeenCalled();
  });

  it('should delete an exising entity only once', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);
      repositoryMock.track(entity, EntityState.LOADED);

      repositoryMock.doDelete.mockResolvedValue(true);

      repositoryMock.delete(entity);
      repositoryMock.delete(entity);

      return repositoryMock;
    });

    // assert
    expect(repository.doDelete).toHaveBeenCalledExactlyOnceWith(entity);
    expect(repository.doInsert).not.toHaveBeenCalled();
    expect(repository.doUpdate).not.toHaveBeenCalled();
  });

  it('should persist a new entity only once', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const repository = await uow.run((ctx) => {
      const repositoryMock = ctx.getRepository(RepositoryMock);

      repositoryMock.doInsert.mockResolvedValue(true);

      repositoryMock.add(entity);
      repositoryMock.add(entity);

      return repositoryMock;
    });

    // assert
    expect(repository.doInsert).toHaveBeenCalledExactlyOnceWith(entity);
    expect(repository.doDelete).not.toHaveBeenCalled();
    expect(repository.doUpdate).not.toHaveBeenCalled();
  });

  it('should fail to delete a new untracked entity', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };

    // act
    const act = () =>
      uow.run((ctx) => {
        const repositoryMock = ctx.getRepository(RepositoryMock);

        repositoryMock.delete(entity);

        return repositoryMock;
      });

    // assert
    await expect(act).rejects.toThrow(
      new Error(
        `Can not track untracked entity as deleted: ${JSON.stringify(entity)}`,
      ),
    );
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
