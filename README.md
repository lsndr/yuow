# Yuow

[![npm version](https://badge.fury.io/js/yuow.svg)](https://badge.fury.io/js/yuow)
[![npm downloads/month](https://img.shields.io/npm/dm/yuow.svg)](https://www.npmjs.com/package/yuow)
[![npm downloads](https://img.shields.io/npm/dt/yuow.svg)](https://www.npmjs.com/package/yuow)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lsndr/yuow/blob/master/LICENSE.md)


`Yuow` is a generic implementation of Unity of Work, Repository and IdentityMap patterns built on top of [Knex](http://knexjs.org/) library.

With `Yuow` you can build a truly isolated domain model.

1. [Quick Start](#quick-start)
2. [Options](#options)
3. [Data Mapper](#data-mapper)
4. [Repository](#repository)

## Quick Start

See [examples folder](https://github.com/lsndr/yuow/tree/master/examples/)

```
  npm install yuow 
```

In order to use Unit Of Work, you will need to implement [Data Mapper](#data-mapper) and [Repository](#repository) for each your model.

```typescript
import { uowFactory } from 'yuow';

const uow = uowFactory(/* pass knex instance here */);

await uow(async (ctx) => {
  const userRepository = ctx.getRepository(UserRepository);
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.changeName(name);

  return {
    id: user.id,
    name: user.name
  };
});
```

## Options

```typescript
uow(unit, {
  globalTransaction: false,
  isolationLevel: 'read commited',
  retries: 3
});
```

### globalTransaction

`Yuow` offers two ways to handle transactions. By default `globalTransaction` is `false`, which means that only computed changes will be queried inside a database transaction. This approach works well if you want to implement an optimistic concurency control.

If you pass `true`, all database interactions inside unit of work will be wrapped with one global transaction. This is helful in case you need a pessimistic concurency control.

### retries

`retries` specifies how many times unit of work must be retried before it throws an error. Retries are perfromed only if `PersistenceError` is thrown. Check out [Data Mapper](#data-mapper) section to see when it's thrown.

### isolationLevel

You can set the same isolation level as provided by Knex library.

## Data Mapper

> The Data Mapper is a layer of software that separates the in-memory objects from the database. Its responsibility is to transfer data between the two and also to isolate them from each other
>
> – [Martin Fowler](https://martinfowler.com/eaaCatalog/dataMapper.html)

### Implementation 

In order to write a data mapper for `Yuow`, you will need to extend an abstract `DataMapper` class exported from `Yuow` package.

There are only three required abstract methods: `insert`, `update` and `delete`. Selection is also a necessary operation, but it is not as trivial as others, so you will need to implement it on your own.


```typescript
import { DataMapper } from 'yuow';
import { Customer } from './model/customer';

export class CustomerDataMapper extends DataMapper<Customer> {
  async findById(id: string): : Promise<Customer | undefined>  {
    //  There can be different variations of selection: findOne, findMany, findByName and e.t.c. You can implement any of them.
  }

  async insert(customer: Customer): Promise<boolean> {
    // Implement
  }

  async update(customer: Customer): Promise<boolean> {
    // Implement
  }

  async delete(customer: Customer) : Promise<boolean> {
    // Implement
  }
}
```


### Selection

In order to load an entity from database, create any method that hydarate your entities and return them in any form: it can be a single entity, an array of entities, a map of entites and e.t.c.

In this example, we create a `findById` method that returns `Customer` entity or `undefined`.

```typescript
async findById(id: string): Promise<Cutomer | undefined> {
  // 1. Request a record from database
  const record = await this.knex
    .select('*')
    .from('customers')
    .where('id', id)
    .first();

  // 2. Return undefined if a record was not found
  if (!record) {
    return;
  }

  // 3. Hydrate Customer entity
  const customer = new CustomerHydrator({
    id: record.id,
    name: record.name,
  });;

  // 4. Remember its version 
  this.setVersion(customer, record.version);

  // 5. Return
  return customer;
}
```

As you can see, this is mostly a trivial operation. But some of the step can raise questions. Let's dive into them.

#### Hydration

In order to protect your domain model invariants you can decide to make constructors protected. This is neccessary if you want the domain model classes to describe exisiting analytic domain model as close as possible.

In such cases hydrators can be used to "recover" your domain model state from database.

Hydradors are just classes that extend your domain model and make constructors public.

```typescript
import { Customer, CustomerState } from './model/customer';

export class CustomerHydrator extends Customer {
  constructor(state: CustomerState) {
    super(state);
  }
}
```


#### Versioning

Versioning is a common approach to implement optimistic concurency control.

Abstract DataMapper provides 3 methods that makes versioning easy: `setVersion`, `increaseVersion` and `getVersion`.

This is an optional step and can be avoided of you are going to use pessimistic concurency control.


### Insert, Delete, Update

Insert, delete and update methods are necessary in order to persist your domain model state.

Those methods are pretty trivial and structurually the same.

```typescript
async insert(customer: Customer) {
  // 1. Get version
  const version = this.getVersion(customer);

  // 2. Insert 
  const result = await this.knex
    .insert({
      id: customer.id,
      name: customer.name,
      version,
    })
    .into('customers');

  // 3. Return result
  return (result[0] || 0) > 0;
}

async update(customer: Customer) {
  // 1. Increase version
  const version = this.increaseVersion(customer);

  // 2. Update
  const result = await this.knex('customers')
    .update({
      id: customer.id,
      name: customer.name,
      version,
    })
    .where('customers.id', customer.id)
    .andWhere('customers.version', version - 1);

  // 3. Return result
  return result > 0;
}

async delete(customer: Customer) {
  // 1. Get version
  const version = this.getVersion(customer);

  // 2. Delete
  const result = await this.knex
    .delete()
    .from('customers')
    .where('customers.id', customer.id)
    .andWhere('customers.version', version);

  // 3. Return result
  return result > 0;
}
```

In the example above method `getVersion` is used to get a current version of an entity, if no version has been previusoly set using `setVersion` method it will return `1`. Method `increaseVersion` increaes version by one and returns it.

It's necessary to always return a boolean result of an operation. Depending on the result, `Youw` decides whether to throw `PersistenceError` and retry an operation. 

## Repository

TODO

## License

Yuow is [MIT licensed](LICENSE.md).