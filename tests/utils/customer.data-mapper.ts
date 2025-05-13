import { CustomerHydrator } from './customer.hydrator';
import { Customer } from './customer';
import { WeakVersionTracker } from '../../src/core';
import { KnexTransaction } from '../../src/knex';

export type FindOneCustomerQuery = {
  id: string;
};

export class CustomerDataMapper {
  private readonly versionTracker = new WeakVersionTracker<Customer>();

  public constructor(private readonly transaction: KnexTransaction) {}

  async findById(id: string): Promise<Customer | undefined> {
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

  async insert(customer: Customer) {
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

  async update(customer: Customer) {
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

  async delete(customer: Customer) {
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
