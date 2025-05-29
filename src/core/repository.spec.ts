import { ChangeTracker, EntityState } from './change-tracker';
import { Repository } from './repository';
import { TransactionMock } from '../../tests/utils/transaction.mock';
import { faker } from '@faker-js/faker';
import 'jest-extended';

class TestRepository extends Repository<object, TransactionMock> {
  public readonly doInsert = jest.fn();
  public readonly doUpdate = jest.fn();
  public readonly doDelete = jest.fn();
  public readonly extractIdentity = jest
    .fn()
    .mockImplementation((entity) => entity.id);

  public loadEntity<E extends object>(entity: E): void {
    this.changeTracker.track(entity, EntityState.LOADED);
  }
}

describe(Repository, () => {
  let transaction: TransactionMock;
  let repository: TestRepository;

  beforeEach(() => {
    transaction = new TransactionMock();
    repository = new TestRepository(transaction);
  });

  describe('add', () => {
    it('should add a new entity', async () => {
      // arrange
      const entity = { id: faker.string.ulid(), name: faker.person.fullName() };
      repository.doInsert.mockResolvedValue(true);

      // act
      repository.add(entity);

      // assert
      await repository.flush();
      expect(repository.doInsert).toHaveBeenCalledExactlyOnceWith(entity);
    });

    it('should recover deleted entity', async () => {
      // arrange
      const entity = { id: faker.string.ulid(), name: faker.person.fullName() };
      repository.loadEntity(entity);
      repository.delete(entity);

      // act
      repository.add(entity);

      // assert
      await repository.flush();
      expect(repository.doDelete).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete loaded entity', async () => {
      // arrange
      const entity = { id: faker.string.ulid(), name: faker.person.fullName() };
      repository.loadEntity(entity);
      repository.doDelete.mockResolvedValue(true);

      // act
      repository.delete(entity);

      // assert
      await repository.flush();
      expect(repository.doDelete).toHaveBeenCalledExactlyOnceWith(entity);
    });

    it('should forget new entity', async () => {
      // arrange
      const entity = { id: faker.string.ulid(), name: faker.person.fullName() };
      repository.add(entity);

      // act
      repository.delete(entity);

      // assert
      await repository.flush();
      expect(repository.doDelete).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('should flush all changes', async () => {
      // arrange
      const newEntity = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      repository.add(newEntity);

      const newAndDeleted = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      repository.add(newAndDeleted);
      repository.delete(newAndDeleted);

      const loadedAndUpdated = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      repository.loadEntity(loadedAndUpdated);
      loadedAndUpdated.name = faker.person.fullName();

      const loadedAndDeleted = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      repository.loadEntity(loadedAndDeleted);
      repository.delete(loadedAndDeleted);

      const loadedAndUnchanged = {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      };
      repository.loadEntity(loadedAndUnchanged);

      repository.doInsert.mockResolvedValue(true);
      repository.doUpdate.mockResolvedValue(true);
      repository.doDelete.mockResolvedValue(true);

      // act
      await repository.flush();

      // assert
      expect(repository.doInsert).toHaveBeenCalledExactlyOnceWith(newEntity);
      expect(repository.doUpdate).toHaveBeenCalledExactlyOnceWith(
        loadedAndUpdated,
      );
      expect(repository.doDelete).toHaveBeenCalledExactlyOnceWith(
        loadedAndDeleted,
      );
    });

    it('should emit beforeFlush and afterFlush events', async () => {
      // arrange
      const beforeFlush = jest.fn();
      const afterFlush = jest.fn();
      repository.on('beforeFlush', beforeFlush);
      repository.on('afterFlush', afterFlush);

      // act
      await repository.flush();

      // assert
      expect(beforeFlush).toHaveBeenCalledExactlyOnceWith(
        expect.any(ChangeTracker),
      );
      expect(afterFlush).toHaveBeenCalledExactlyOnceWith(
        expect.any(ChangeTracker),
      );
    });

    it('should start transaction if it is not started', async () => {
      // act
      await repository.flush();

      // assert
      expect(transaction.doBegin).toHaveBeenCalledTimes(1);
    });

    it('should not start transaction if it is already started', async () => {
      await transaction.begin();

      // act
      await repository.flush();

      // assert
      expect(transaction.doBegin).toHaveBeenCalledTimes(1);
    });
  });
});
