import { Property, Schema } from '../../../../src/knex';
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
  },
  {
    version: false,
    identity: 'state.id',
    table: 'entity',
  },
);

const EntityDataMapper = schema.createDataMapper();

export { EntityDataMapper };
