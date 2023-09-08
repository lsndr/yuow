import { Property, Schema } from '../../src/orm';
import { Customer } from '../model/customer';

const schema = new Schema(
  Customer,
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
    table: 'customers',
  },
);

const CustomerRepository = schema.createRepository();

export { CustomerRepository };
