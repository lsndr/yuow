import { WeakVersionTracker } from '../../../src/core';
import { CustomerHydrator } from './customer.hydrator';
import type { Customer } from './customer';
import type { KnexTransaction } from './knex.transaction';

export type FindOneCustomerQuery = {
  id: string;
};

export class CustomerDataMapper {
  private readonly versionTracker = new WeakVersionTracker<Customer>();

  public constructor(private readonly transaction: KnexTransaction) {}

  public async findById(id: string): Promise<Customer | undefined> {
    const record = await this.transaction.knex
      .select('*')
      .from('customers')
      .where('id', id)
      .first();

    if (!record) {
      return;
    }

    const customer = this.map(record);

    this.versionTracker.setVersion(customer, record.version);

    return customer;
  }

  public async insert(customer: Customer): Promise<boolean> {
    const version = this.versionTracker.getVersion(customer);

    const result = await this.transaction.knex
      .insert({
        id: customer.id,
        name: customer.name,
        cards: JSON.stringify(customer.cards),
        version,
      })
      .into('customers');

    return (result[0] || 0) > 0;
  }

  public async update(customer: Customer): Promise<boolean> {
    const version = this.versionTracker.increaseVersion(customer);
    const result = await this.transaction
      .knex('customers')
      .update({
        id: customer.id,
        name: customer.name,
        cards: JSON.stringify(customer.cards),
        version,
      })
      .where('customers.id', customer.id)
      .andWhere('customers.version', version - 1);

    return result > 0;
  }

  public async delete(customer: Customer): Promise<boolean> {
    const version = this.versionTracker.getVersion(customer);

    const result = await this.transaction.knex
      .delete()
      .from('customers')
      .where('customers.id', customer.id)
      .andWhere('customers.version', version);

    return result > 0;
  }

  private map(record: any) {
    return new CustomerHydrator({
      id: record.id,
      name: record.name,
      cards: JSON.parse(record.cards),
    });
  }
}
