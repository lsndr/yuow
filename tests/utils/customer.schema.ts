import { JsonProperty, Property, Schema } from '../../src/knex';
import { Customer } from './customer';

const schema = new Schema(
  Customer,
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
    table: 'customers',
  },
);

const CustomerRepository = schema.createRepository();

export { CustomerRepository };
