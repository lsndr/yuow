import { KnexTransaction } from '../../src/knex';
import { EntityState, Repository } from '../../src/core';
import { CustomerDataMapper } from './customer.data-mapper';
import { Customer } from './customer';

export class CustomerRepository extends Repository<Customer, KnexTransaction> {
  private readonly mapper: CustomerDataMapper;

  constructor(transaction: KnexTransaction) {
    super(transaction);

    this.mapper = new CustomerDataMapper(transaction);
  }

  async findById(id: string) {
    const result = await this.mapper.findById(id);

    return this.trackAll(result, EntityState.LOADED);
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
