import { Entity } from './entity';
import {
  JsonProperty,
  Property,
  Schema,
  type SchemaOptions,
} from '../../../src/knex';
import { type Migration } from '../knex/migrations';
import { faker } from '@faker-js/faker';
import { type Knex } from 'knex';

export const createEntitySchema = (
  options?: Partial<SchemaOptions>,
): { schema: Schema<Entity>; migration: Migration } => {
  const schema = new Schema(
    Entity,
    {
      id: new Property({
        name: 'id',
      }),
      name: new Property({
        name: 'name',
      }),
      cards: new JsonProperty({
        name: 'cards',
      }),
    },
    {
      version: true,
      identity: 'id',
      table: `entity_${faker.word.adjective()}_${faker.word.noun()}_${faker.string.numeric(5)}`,
      ...options,
    },
  );

  return {
    schema,
    migration: createEntityMigration(schema),
  };
};

const createEntityMigration = (schema: Schema<Entity>): Migration => {
  return {
    name: `create_${schema.options.table}`,
    up: (knex: Knex): Promise<void> => {
      return knex.schema.createTable(schema.options.table, (table) => {
        table.uuid('id').primary().unique();
        table.text('name').notNullable();
        table.jsonb('cards').notNullable();

        if (schema.options.version) {
          table.smallint('version').notNullable();
        }
      });
    },
    down: (knex: Knex): Promise<void> => {
      return knex.schema.dropTable(schema.options.table);
    },
  };
};
