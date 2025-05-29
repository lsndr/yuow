import { JsonProperty } from './json-property';
import { faker } from '@faker-js/faker';

describe(JsonProperty, () => {
  let propertyName: string;
  let property: JsonProperty;

  beforeEach(() => {
    propertyName = faker.database.column();
    property = new JsonProperty({ name: propertyName });
  });

  describe('constructor', () => {
    it('should create a property with the provided name', () => {
      expect(property.name).toBe(propertyName);
    });
  });

  describe('toDatabaseValue', () => {
    it('should stringify object', () => {
      // arrange
      const value = { key: faker.word.noun() };

      // act
      const result = property.toDatabaseValue(value);

      // assert
      expect(result).toBe(JSON.stringify(value));
    });
  });

  describe('fromDatabaseValue', () => {
    it('should parse string value', () => {
      // arrange
      const value = { key: faker.word.noun() };

      // act
      const result = property.fromDatabaseValue(JSON.stringify(value));

      // assert
      expect(result).toEqual(value);
    });

    it.each([1, undefined, {}])(
      'should return non-string (%s) value as it is',
      (value) => {
        // act
        const result = property.fromDatabaseValue(value);

        // assert
        expect(result).toBe(value);
      },
    );
  });
});
