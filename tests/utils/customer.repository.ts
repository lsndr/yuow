import { DBContext, Repository } from '../../src';
import { CustomerDataMapper } from './customer.data-mapper';
import { Customer } from './customer';
import { KnexTransaction, KnexTransactionOptions } from './knex.transaction';

export class CustomerRepository extends Repository<
  Customer,
  KnexTransaction,
  KnexTransactionOptions
> {
  private readonly mapper: CustomerDataMapper;

  constructor(context: DBContext<KnexTransaction, KnexTransactionOptions>) {
    super(context);

    this.mapper = new CustomerDataMapper(context.transaction.knex);
  }

  async findById(...args: Parameters<CustomerDataMapper['findById']>) {
    const result = await this.mapper.findById(...args);

    return this.trackAll(result, 'loaded');
  }

  protected extractIdentity(customer: Customer) {
    return customer.id;
  }

  protected insert(entity: Customer): Promise<boolean> {
    return this.mapper.insert(entity);
  }

  protected update(entity: Customer): Promise<boolean> {
    return this.mapper.update(entity);
  }

  protected remove(entity: Customer): Promise<boolean> {
    return this.mapper.delete(entity);
  }
}
