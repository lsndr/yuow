import { JsonProperty, Property, Schema } from '../../../src/knex';
import { Entity } from './entity';

const schema = new Schema(
  Entity,
  {
    'state.id': new Property({
      name: 'id',
    }),
    'state.name': new Property({
      name: 'name',
    }),
    'state.cards': new JsonProperty({
      name: 'cards',
    }),
  },
  {
    version: true,
    identity: 'state.id',
    table: 'entity',
  },
);

const EntityRepository = schema.createRepository();
const EntityDataMapper = schema.createDataMapper();

export { EntityRepository, EntityDataMapper };
