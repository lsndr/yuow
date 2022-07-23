import { Repository } from '../../src';
import { CustomerDataMapper } from '../data-mappers/customer.data-mapper';
import { Customer } from '../model/customer';

export class CustomerRepository extends Repository<
  Customer,
  CustomerDataMapper
> {
  protected mapper = CustomerDataMapper;

  protected extractIdentity(customer: Customer) {
    return customer.id;
  }
}
