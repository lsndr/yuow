import { EntityState, Repository } from '../../../src/core';
import { CustomerDataMapper } from './customer.data-mapper';
import type { Customer } from './customer';
import type { KnexTransaction } from './knex.transaction';

export class CustomerRepository extends Repository<Customer, KnexTransaction> {
  private readonly mapper: CustomerDataMapper;

  public constructor(transaction: KnexTransaction) {
    super(transaction);

    this.mapper = new CustomerDataMapper(transaction);
  }

  public async findById(id: string): Promise<Customer | undefined> {
    const result = await this.mapper.findById(id);

    return this.trackAll(result, EntityState.LOADED);
  }

  protected extractIdentity(customer: Customer): string {
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
