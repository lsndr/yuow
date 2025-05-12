import { DBContext, Repository, KnexTransaction } from '../../src';
import { CustomerDataMapper } from './customer.data-mapper';
import { Customer } from './customer';

export class CustomerRepository extends Repository<Customer, KnexTransaction> {
  private readonly mapper: CustomerDataMapper;

  constructor(context: DBContext<KnexTransaction>) {
    super(context);

    this.mapper = new CustomerDataMapper();
  }

  async findById(id: string) {
    const result = await this.mapper.findById(
      this.context.transaction.knex,
      id,
    );

    return this.trackAll(result, 'loaded');
  }

  protected extractIdentity(customer: Customer) {
    return customer.id;
  }

  protected insert(entity: Customer): Promise<boolean> {
    return this.mapper.insert(this.context.transaction.knex, entity);
  }

  protected update(entity: Customer): Promise<boolean> {
    return this.mapper.update(this.context.transaction.knex, entity);
  }

  protected remove(entity: Customer): Promise<boolean> {
    return this.mapper.delete(this.context.transaction.knex, entity);
  }
}
