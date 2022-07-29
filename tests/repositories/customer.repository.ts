import { Repository } from '../../src';
import { CustomerDataMapper } from '../data-mappers/customer.data-mapper';
import { Customer } from '../model/customer';

export class CustomerRepository extends Repository<
  Customer,
  CustomerDataMapper
> {
  protected mapperConstructor = CustomerDataMapper;

  async findById(...args: Parameters<CustomerDataMapper['findById']>) {
    const result = await this.mapper.findById(...args);

    return this.trackAll(result, 'loaded');
  }

  protected extractIdentity(customer: Customer) {
    return customer.id;
  }
}
