import { EntityState } from './entity-state';
import { TrackedEntity } from './tracked-entity';
import { describe, it, expect } from 'vitest';

describe(TrackedEntity, () => {
  describe('constructor', () => {
    it('should create a tracked entity with the given reference and state', () => {
      // arrange
      const entity = { id: '123', name: 'Test Entity' };
      const state = EntityState.NEW;

      // act
      const trackedEntity = new TrackedEntity(entity, state);

      // assert
      expect(trackedEntity.ref).toBe(entity);
      expect(trackedEntity.state).toBe(state);
    });
  });

  describe('revalidate', () => {
    it('should return true if the snapshot has not changed', () => {
      // arrange
      const entity = { id: '123', name: 'Test Entity' };
      const state = EntityState.NEW;
      const trackedEntity = new TrackedEntity(entity, state);

      // act
      const result = trackedEntity.revalidate();

      // assert
      expect(result).toBe(true);
    });

    it('should return false if the snapshot has changed and update state', () => {
      // arrange
      const entity = { id: '123', name: 'Test Entity' };
      const state = EntityState.NEW;
      const trackedEntity = new TrackedEntity(entity, state);

      // Modify the entity to change the snapshot
      entity.name = 'Updated Entity';

      // act
      const result = trackedEntity.revalidate();

      // assert
      expect(result).toBe(false);
      expect(trackedEntity.revalidate()).toBeTruthy();
    });
  });
});
