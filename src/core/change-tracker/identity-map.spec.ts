import { faker } from '@faker-js/faker';
import { EntityState } from './entity-state';
import { IdentityMap } from './identity-map';
import { TrackedEntity } from './tracked-entity';

interface Entity {
  id: string;
  name?: string;
}

describe(IdentityMap, () => {
  describe('put', () => {
    it.each([EntityState.DELETED, EntityState.NEW, EntityState.LOADED])(
      'should put entity in %s state',
      (state) => {
        // arrange
        const map = new IdentityMap<Entity>((entity) => entity.id);
        const entity = { id: faker.string.uuid() };
        const trackedEntity = new TrackedEntity(entity, state);

        // act
        map.put(trackedEntity);

        // assert
        expect(map.get(entity)).toBe(trackedEntity);
      },
    );

    it('should fail to put entity if there is already one with same identifier', () => {
      // arrange
      const map = new IdentityMap<Entity>((entity) => entity.id);
      const entity1 = { id: faker.string.uuid() };
      const entity2 = { id: entity1.id };
      const trackedEntity1 = new TrackedEntity(entity1, EntityState.NEW);
      const trackedEntity2 = new TrackedEntity(entity2, EntityState.NEW);

      map.put(trackedEntity1);

      // act
      const act = () => map.put(trackedEntity2);

      // assert
      expect(act).toThrow(
        new Error(`Entity already exists in the identity map`),
      );
    });
  });

  describe('get', () => {
    it('should get entity from identity map', () => {
      // arrange
      const map = new IdentityMap<Entity>((entity) => entity.id);
      const entity = { id: faker.string.uuid() };
      const trackedEntity = new TrackedEntity(entity, EntityState.NEW);

      map.put(trackedEntity);

      // act
      const result = map.get(entity);

      // assert
      expect(result).toBe(trackedEntity);
    });

    it('should fail to get entity if there is already one with same identifier', () => {
      // arrange
      const map = new IdentityMap<Entity>((entity) => entity.id);
      const entity1 = { id: faker.string.uuid() };
      const entity2 = { id: entity1.id };

      map.put(new TrackedEntity(entity1, EntityState.NEW));

      // act
      const act = () => map.get(entity2);

      // assert
      expect(act).toThrow(
        new Error(
          `2 different entities have the same identifier. \r\n\r\nEntity: \r\n${JSON.stringify(entity2)}\r\nTracked Entity:\r\n${JSON.stringify(entity1)}`,
        ),
      );
    });
  });

  describe('delete', () => {
    it('should delete entity from identity map', () => {
      // arrange
      const map = new IdentityMap<Entity>((entity) => entity.id);
      const entity = { id: faker.string.uuid() };
      const trackedEntity = new TrackedEntity(entity, EntityState.NEW);

      map.put(trackedEntity);

      // act
      map.delete(entity);

      // assert
      expect(map.get(entity)).toBeUndefined();
    });
  });
});
