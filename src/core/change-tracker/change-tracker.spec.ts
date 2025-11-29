import { ChangeTracker } from './change-tracker';
import { EntityState } from './entity-state';
import { faker } from '@faker-js/faker';
import { beforeEach, describe, it, expect } from 'vitest';

interface Entity {
  id: string;
  name?: string;
}

describe(ChangeTracker, () => {
  let tracker: ChangeTracker<Entity>;

  beforeEach(() => {
    tracker = new ChangeTracker<Entity>((entity) => entity.id);
  });

  describe('getTrackedOrTrack', () => {
    it('should return tracked entity if there is alredy one with same identity', () => {
      // arrane
      const entity = { id: faker.string.uuid() };
      tracker.track(entity, EntityState.NEW);

      // act
      const trackedEntity = tracker.getTrackedOrTrack(
        { id: entity.id },
        EntityState.LOADED,
      );

      // assert
      expect(trackedEntity).toBe(entity);
    });

    it.each([EntityState.NEW, EntityState.LOADED])(
      'should track entity as %s',
      (state) => {
        // arrane
        const entity = { id: faker.string.uuid() };

        // act
        const trackedEntity = tracker.getTrackedOrTrack(entity, state);

        // assert
        expect(trackedEntity).toBe(entity);
        expect(tracker.isTracked(entity)).toBe(state);
      },
    );
  });

  describe('getTracked', () => {
    it('should return reference to tracked entity', () => {
      // arrange
      const trackedEntity = { id: faker.string.uuid() };

      tracker.track(trackedEntity, EntityState.NEW);

      // act
      const result = tracker.getTracked({ id: trackedEntity.id });

      // assert
      expect(result).toBe(trackedEntity);
    });

    it('should throw if entity is not tracked', () => {
      // arrange
      const entity = { id: faker.string.uuid() };

      // act
      const act = () => tracker.getTracked(entity);

      // assert
      expect(act).toThrow(
        new Error(`Entity is not tracked: ${JSON.stringify(entity)}`),
      );
    });
  });

  describe('track', () => {
    it('should fail to track entities with same identifier', () => {
      // arrange
      const entity1 = { id: faker.string.uuid() };
      const entity2 = { id: entity1.id };

      // act
      const act = () => {
        tracker.track(entity1, EntityState.NEW);
        tracker.track(entity2, EntityState.NEW);
      };

      // assert
      expect(act).toThrow(
        new Error(
          `Can not track entity as NEW because there is already tracked entity with similar identity.\r\n\r\nNew entity: ${JSON.stringify(entity2)}\r\nTracked entity: ${JSON.stringify(entity1)}`,
        ),
      );
    });

    it.each([EntityState.NEW, EntityState.LOADED, EntityState.DELETED])(
      'should fail (.+) to track entity as %s if there is already tracked entity with similar id',
      (state) => {
        // arrange
        const entity1 = { id: faker.string.uuid() };
        const entity2 = { id: entity1.id };
        tracker.track(entity1, EntityState.NEW);

        // act
        const act = () => tracker.track(entity2, state);

        // assert
        expect(act).toThrow(
          new Error(
            `Can not track entity as ${state} because there is already tracked entity with similar identity.\r\n\r\nNew entity: ${JSON.stringify(entity2)}\r\nTracked entity: ${JSON.stringify(entity1)}`,
          ),
        );
      },
    );

    describe(EntityState.NEW, () => {
      it(`should track entity as ${EntityState.NEW}`, () => {
        // arrabge
        const entity = { id: faker.string.uuid() };

        // act
        tracker.track(entity, EntityState.NEW);

        // assert
        expect(tracker.isTracked(entity)).toBe(EntityState.NEW);
      });

      it(`should fail % to track ${EntityState.LOADED} entity as ${EntityState.NEW}`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };
        tracker.track(entity, EntityState.LOADED);

        // act
        const act = () => tracker.track(entity, EntityState.NEW);

        // assert
        expect(act).toThrow(
          new Error(
            `Can not track entity as ${EntityState.NEW} because it is already in ${EntityState.LOADED} state: ${JSON.stringify(entity)}`,
          ),
        );
      });

      it(`should fail to track ${EntityState.DELETED} as ${EntityState.NEW}`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };
        tracker.track(entity, EntityState.LOADED);
        tracker.track(entity, EntityState.DELETED);

        // act
        const act = () => tracker.track(entity, EntityState.NEW);

        // assert
        expect(act).toThrow(
          new Error(
            `Can not track entity as ${EntityState.NEW} because it is already in ${EntityState.DELETED} state: ${JSON.stringify(entity)}`,
          ),
        );
      });
    });

    describe(EntityState.LOADED, () => {
      it(`should track entity as ${EntityState.LOADED}`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };

        // act
        tracker.track(entity, EntityState.LOADED);

        // assert
        expect(tracker.isTracked(entity)).toBe(EntityState.LOADED);
      });

      it.each([EntityState.NEW, EntityState.DELETED])(
        `should track %s entity as ${EntityState.LOADED}`,
        (state) => {
          // arrange
          const entity = { id: faker.string.uuid() };
          tracker.track(entity, EntityState.NEW); // Workaround to track DELETED state
          tracker.track(entity, state);

          // act
          tracker.track(entity, EntityState.LOADED);

          // assert
          expect(tracker.isTracked(entity)).toBe(EntityState.LOADED);
        },
      );
    });

    describe(EntityState.DELETED, () => {
      it(`should untrack ${EntityState.NEW} entity`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };
        tracker.track(entity, EntityState.NEW);

        // act
        tracker.track(entity, EntityState.DELETED);

        // assert
        expect(tracker.isTracked(entity)).toBe(false);
      });

      it(`should track ${EntityState.LOADED} entity as ${EntityState.DELETED}`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };
        tracker.track(entity, EntityState.LOADED);

        // act
        tracker.track(entity, EntityState.DELETED);

        // assert
        expect(tracker.isTracked(entity)).toBe(EntityState.DELETED);
      });

      it(`should fail to track untracked entity as ${EntityState.DELETED}`, () => {
        // arrange
        const entity = { id: faker.string.uuid() };

        // act
        const act = () => tracker.track(entity, EntityState.DELETED);

        // assert
        expect(act).toThrow(
          new Error(
            `Can not track untracked entity as ${EntityState.DELETED}: ${JSON.stringify(entity)}`,
          ),
        );
      });
    });
  });

  describe('compute', () => {
    it('should compute changes', () => {
      // arrange

      // New and then deleted entity – should not be in changes
      const newAndDeleted = { id: faker.string.uuid() };
      tracker.track(newAndDeleted, EntityState.NEW);
      tracker.track(newAndDeleted, EntityState.DELETED);

      // Loaded entity but not changed – should be in stale
      const loadedUnchanged = { id: faker.string.uuid() };
      tracker.track(loadedUnchanged, EntityState.LOADED);

      // Loaded entity with changes – should be in updated
      const loadedChanged = {
        id: faker.string.uuid(),
        name: faker.person.firstName(),
      };
      tracker.track(loadedChanged, EntityState.LOADED);
      loadedChanged.name = faker.person.firstName();

      // New entity – should be in created
      const created = { id: faker.string.uuid() };
      tracker.track(created, EntityState.NEW);

      // Loaded and deleted – should be in deleted
      const loadedAndDeleted = { id: faker.string.uuid() };
      tracker.track(loadedAndDeleted, EntityState.LOADED);
      tracker.track(loadedAndDeleted, EntityState.DELETED);

      // act
      const changes = tracker.compute();

      // assert
      expect(changes.created).toEqual([created]);
      expect(changes.updated).toEqual([loadedChanged]);
      expect(changes.deleted).toEqual([loadedAndDeleted]);
      expect(changes.stale).toEqual([loadedUnchanged]);
    });
  });

  describe('untrack', () => {
    it.each([EntityState.NEW, EntityState.LOADED, EntityState.DELETED])(
      'should untrack %s entity',
      (state) => {
        // arrange
        const entity = { id: faker.string.uuid() };
        tracker.track(entity, EntityState.NEW); // Workaround to track DELETED state
        tracker.track(entity, state);

        // act
        tracker.untrack(entity);

        // assert
        expect(tracker.isTracked(entity)).toBe(false);
      },
    );
  });
});
