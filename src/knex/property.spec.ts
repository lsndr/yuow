import { faker } from '@faker-js/faker';
import { Property } from './property';

describe(Property, () => {
  let propertyName: string;
  let property: Property;

  beforeEach(() => {
    propertyName = faker.database.column();
    property = new Property({ name: propertyName });
  });

  describe('constructor', () => {
    it('should create a property with the provided name', () => {
      expect(property.name).toBe(propertyName);
    });
  });

  describe('toDatabaseValue', () => {
    it('should return the value as is', () => {
      const value = faker.word.noun();
      expect(property.toDatabaseValue(value)).toBe(value);
    });
  });

  describe('fromDatabaseValue', () => {
    it('should return the value as is', () => {
      const value = faker.word.noun();
      expect(property.fromDatabaseValue(value)).toBe(value);
    });
  });
});
