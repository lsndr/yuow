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
    version: true,
    identity: 'state.id',
    table: 'versioned_entity',
  },
);

const VersionedEntityDataMapper = schema.createDataMapper();

export { VersionedEntityDataMapper };
