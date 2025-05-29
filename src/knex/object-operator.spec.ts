import { ObjectOperator } from './object-operator';
import { faker } from '@faker-js/faker';

interface Entity {
  name: string;
  sub: {
    path: number;
  };
}

describe(ObjectOperator, () => {
  let entity: Entity;
  let operator: ObjectOperator;

  beforeEach(() => {
    entity = {
      name: faker.person.firstName(),
      sub: { path: faker.number.int() },
    };
    operator = new ObjectOperator(entity);
  });

  describe('extract', () => {
    it('should extract a value from the object by path', () => {
      // act
      const value1 = operator.extract('name');
      const value2 = operator.extract('sub.path');

      // assert
      expect(value1).toBe(entity.name);
      expect(value2).toBe(entity.sub.path);
    });

    it('should return undefined for unexisting path', () => {
      // act
      const value = operator.extract('non.existing.path');

      // assert
      expect(value).toBeUndefined();
    });
  });
});
