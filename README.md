# Yuow

[![codecov](https://codecov.io/gh/lsndr/yuow/branch/alpha/graph/badge.svg?token=U33MY3DYHK)](https://codecov.io/gh/lsndr/yuow)
[![npm version](https://badge.fury.io/js/yuow.svg?1)](https://badge.fury.io/js/yuow?`)
[![npm downloads/month](https://img.shields.io/npm/dm/yuow.svg)](https://www.npmjs.com/package/yuow)
[![npm downloads](https://img.shields.io/npm/dt/yuow.svg)](https://www.npmjs.com/package/yuow)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lsndr/yuow/blob/master/LICENSE.md)

`Yuow` is a generic implementation of Unit of Work and Repository patterns. It's not a replacement for your current ORM, but a great addition to it especially if you use tactical DDD patterns.

With `Yuow` you can build a truly isolated domain model.

1. [Quick Start](#quick-start)
2. [Repository](#repository)
3. [Run Options](#run-options)
4. [Versioning](#versioning)

## Quick Start

```
  npm install yuow
```

`Yuow` supports [Knex](https://knexjs.org/) out of the box, but you can integrate with any other database driver or ORM.
In order to start, you should implement [Repository](#repository) for each of your model.

This an example code of how to use `Yuow` with Knex:

```typescript
import { Uow, UowContext } from 'yuow/core';
import { KnexEngine } from 'yuow/knex';

const uow = new Uow(new KnexEngine(/* put knex instance here */));

app.use((next) => {
  return UowContext.create(uow, next);
});
```

And then in your application code initialize repository and use it to store your domain entity:

```typescript
import { Transactional, Context } from 'yuow/core';

class OrderController {
  @Post('/orders')
  @Transactional()
  createOrder() {
    const repository = Context.getRepository(OrderRepository);

    const order = new Order({
      id: crypto.randomUUID(),
    });

    repository.add(order);
  }

  @Post('/orders/:id/cancel')
  @Transactional()
  createOrder(@Param('id') id: string) {
    const repository = Context.getRepository(OrderRepository);
    const order = await repository.findById(id);

    order.cancel();
  }
}
```

The example above implies that you already have `Order` entity and `OrderRepository` implemented. Check the [Repository](#repository) section for more details on how to implement a repository.

## Repository

> A Repository mediates between the domain and data mapping layers, acting like an in-memory domain object collection
>
> – [Martin Fowler](https://martinfowler.com/eaaCatalog/repository.html)

In `Yuow` data mapper and repository responsibilities are merged together for simplicity. But you are free to encapsulate data mapping logic into a separate class.

In order to create a repository, you have to extend abstract `Repository` class and implement 4 methods `extractIdentity`, `flushInsert`, `flushUpdate` and `flushDelete`. Also, even though it's not required, you should write selection methods on your own:

```typescript
import { Repository } from 'yuow/core';
import { type KnexTransaction } from 'yuow/knex';

export class OrderRepository extends Repository<Order, KnexTransaction>> {
  async find(id: string>) {
    // Implement
  }

  protected extractIdentity(order: Order) {
    // Implement
  }

  protected flushInsert(order: Order) {
    // Implement
  }

  protected flushUpdate(order: Order) {
    // Implement
  }

  protected flushDelete(order: Order) {
    // Implement
  }
}
```

### extractIdentity

To emulate a collection-like behaviour, a repository uses an Identity Map pattern to keep identity <–> entity references. Since, with `Yuow` your domain model can live truly isolated, it's necessary to give the repository information on how to extract identity from your entity.

```typescript
protected extractIdentity(order: Order) {
  return order.id;
}
```

### Selection

In order to load an entity from database, you should create a method that hydrates your entity and returns it. Usually it's enough to have a single method that returns an entity by its identity, but you can implement any selection methods you need.

In this example, we create a `find` method that returns `Order` entity or `undefined`.

```typescript
async find(id: string): Promise<Order | undefined> {
  // 1. Request a record from database
  const record = await this.knex
    .select('*')
    .from('orders')
    .where('id', id)
    .first();

  // 2. Return undefined if a record was not found
  if (!record) {
    return;
  }

  // 3. Hydrate Order entity
  const order = new Order({
    id: record.id,
    name: record.name,
  });

  // 4. Store entity in identity map and return
  return this.changeTracker.getTrackedOrTrack(result, EntityState.LOADED);
}
```

### Insert, Delete, Update

Insert, delete and update methods are necessary to be able to persist your domain model state.

Those methods are pretty trivial and structurually the same. The example above lacks concurrency control logic, so it's up to you how to implement it if you need it: you can use database means like row-level locks or use [versioning](#versioning).

```typescript
async flushInsert(order: Order) {
  // 1. Insert
  const result = await this.knex
    .insert({
      id: order.id,
      name: order.name
    })
    .into('orders');

  // 2. Return result
  return (result[0] || 0) > 0;
}

async flushUpdate(order: Order) {
  // 1. Update
  const result = await this.knex('orders')
    .update({
      id: order.id,
      name: order.name,
    })
    .where('orders.id', order.id);

  // 2. Return result
  return result > 0;
}

async flushDelete(order: Order) {
  // 1. Delete
  const result = await this.knex
    .delete()
    .from('orders')
    .where('orders.id', order.id);

  // 2. Return result
  return result > 0;
}
```

It's necessary to always return a boolean result if operation is successful. Depending on the result, `Yuow` decides whether to throw `PersistenceError` and retry an operation.

## Run Options

```typescript
@Transactional({
  retries: 3,
  transaction: { /* transaction options */ }
})
createOrder() { /* ... */ }
```

### retries

`retries` specifies how many times unit of work must be retried before it throws an error. Retries are performed only if `PersistenceError` is thrown. Check out [Repository](#repository) section to see when it's thrown.

This is useful when you use `version` field for optimistic concurrency control.

### transaction

`transaction` is an object that contains transaction options. Its structure depends on engine you use. For example, if you use `KnexEngine`, it should contain `isolationLevel` and `global` properties.

```typescript
{
  isolationLevel: 'read committed' | 'repeatable read' | 'serializable',
  global: false
}
```

## Versioning

`Yuow` provides a simple versioning utility to help you handle optimistic concurrency control:

```typescript
import { Repository, WeakVersionTracker } from 'yuow/core';

class OrderRepository extends Repository<Order, KnexTransaction> {
  private readonly versionTracker = new WeakVersionTracker<Order>();

  // ...
  async find(id: string): Promise<Order | undefined> {
    // 1. Request a record from database
    const record = await this.knex
      .select('*')
      .from('orders')
      .where('id', id)
      .first();

    // 2. Return undefined if a record was not found
    if (!record) {
      return;
    }

    // 3. Hydrate Order entity
    const order = new Order({
      id: record.id,
      name: record.name,
    });

    // 4. Remember its version
    this.versionTracker.setVersion(order, record.version);

    // ...
  }

  async flushInsert(order: Order) {
    const result = await this.knex
      .insert({
        id: order.id,
        name: order.name,
        version: 1, // Initial version
      })
      .into('orders');

    return (result[0] || 0) > 0;
  }

  protected flushUpdate(order: Order) {
    const version = this.versionTracker.increaseVersion(entity); // Call it in order to get new increased version number

    const result = await this.knex('orders')
      .update({
        id: order.id,
        name: order.name,
        version: version,
      })
      .where('orders.id', order.id)
      .andWhere('version', version - 1);

    return result > 0;
  }

  // ...
}
```

## License

Yuow is [MIT licensed](LICENSE.md).
