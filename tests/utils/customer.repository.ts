import { Repository } from '../../src';
import { CustomerDataMapper } from './customer.data-mapper';
import { Customer } from './customer';

export class CustomerRepository extends Repository<
  Customer,
  CustomerDataMapper
> {
  [Repository.DataMapper] = CustomerDataMapper;

  async findById(...args: Parameters<CustomerDataMapper['findById']>) {
    const result = await this.mapper.findById(...args);

    return this.trackAll(result, 'loaded');
  }

  protected extractIdentity(customer: Customer) {
    return customer.id;
  }
}
