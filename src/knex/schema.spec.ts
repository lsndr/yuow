import { type EntityProperties } from './entity-properties-map';
import { Property } from './property';
import { Schema, type SchemaOptions } from './schema';

class Entity {
  public constructor(
    public id: number,
    public name: string,
  ) {}
}

describe(Schema, () => {
  let entityConstructor: typeof Entity;
  let entityProperties: EntityProperties;
  let schemaOptions: SchemaOptions;
  let schema: Schema<Entity>;

  beforeEach(() => {
    entityConstructor = Entity;
    entityProperties = {
      id: new Property({
        name: 'id',
      }),
      name: new Property({
        name: 'name',
      }),
    };
    schemaOptions = {
      identity: 'id',
      table: 'entity',
    };
    schema = new Schema(entityConstructor, entityProperties, schemaOptions);
  });

  describe('constructor', () => {
    it('should create a schema with the provided entity constructor, properties, and options', () => {
      expect(schema.entityConstructor).toBe(entityConstructor);
      expect(schema.properties).toBe(entityProperties);
      expect(schema.options).toBe(schemaOptions);
    });
  });

  describe('createDataMapper', () => {
    it('should create a data mapper', () => {
      // act
      const dataMapper = schema.createDataMapper();

      // assert
      expect(dataMapper).toBeDefined();
    });
  });

  describe('createRepository', () => {
    it('should create a repostory', () => {
      // act
      const repostory = schema.createRepository();

      // assert
      expect(repostory).toBeDefined();
    });
  });
});
