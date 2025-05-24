import { Transactional, Uow, UowContext, Context } from '../../src/core';
import { EngineMock } from './utils/engine.mock';
import { RepositoryMock } from './utils/repository.mock';
import { TransactionMock } from './utils/transaction.mock';
import { faker } from '@faker-js/faker';
import 'jest-extended';

class TestService {
  @Transactional()
  public persistEntityUsingStaticContextGetRepository(entity: object): void {
    Context.getRepository(RepositoryMock).add(entity);
  }

  @Transactional()
  public async persistAndFlushUsingStaticContextFlush(
    onBeforeFlush: (...args: any[]) => void,
    onAfterFlush: (...args: any[]) => void,
    entity1: object,
    entity2: object,
  ) {
    // несколькл раз регается обработчик. Посмотреть должна так быть или они должны быть уникальными
    Context.get().on('beforeFlush', (repository) =>
      repository.on('beforeFlsuh', (ct) => onBeforeFlush(ct.compute())),
    );
    Context.get().on('afterFlush', (repository) =>
      repository.on('afterFlush', (ct) => onAfterFlush(ct.compute())),
    );

    Context.getRepository(RepositoryMock).add(entity1);

    await Context.flush();

    Context.getRepository(RepositoryMock).add(entity2);
  }
}

describe('Core – Decorators', () => {
  let engineMock: EngineMock;
  let transactionMock: TransactionMock;
  let uow: Uow<EngineMock>;
  let testService = new TestService();

  beforeEach(() => {
    transactionMock = new TransactionMock();
    engineMock = new EngineMock(transactionMock);

    uow = new Uow(engineMock);
    testService = new TestService();
  });

  it('should persist entity', async () => {
    // arrange
    const entity = { id: faker.string.uuid(), name: faker.person.fullName() };
    RepositoryMock.doInsert.mockResolvedValue(true);

    // act
    await UowContext.create(uow, () =>
      testService.persistEntityUsingStaticContextGetRepository(entity),
    );

    // assert
    expect(RepositoryMock.doInsert).toHaveBeenCalledExactlyOnceWith(entity);
  });

  it('should persist and flush', async () => {
    // arrange
    const entity1 = { id: faker.string.uuid(), name: faker.person.fullName() };
    const entity2 = { id: faker.string.uuid(), name: faker.person.fullName() };

    const onBeforeFlush = jest.fn();
    const onAfterFlush = jest.fn();

    RepositoryMock.doInsert.mockResolvedValue(true);

    // act
    await UowContext.create(uow, () =>
      testService.persistAndFlushUsingStaticContextFlush(
        onBeforeFlush,
        onAfterFlush,
        entity1,
        entity2,
      ),
    );

    // assert
    expect(onBeforeFlush).toHaveBeenCalledTimes(2);
    expect(onBeforeFlush.mock.calls[0][0]).toEqual({
      created: [entity1],
      updated: [],
      deleted: [],
      stale: [],
    });
    expect(onAfterFlush).toHaveBeenCalledTimes(2);
    expect(RepositoryMock.doInsert).toHaveBeenCalledTimes(2);
    expect(RepositoryMock.doInsert).toHaveBeenNthCalledWith(1, entity1);
    expect(RepositoryMock.doInsert).toHaveBeenNthCalledWith(2, entity2);
  });
});
