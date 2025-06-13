# Yuow

[![codecov](https://codecov.io/gh/lsndr/yuow/branch/alpha/graph/badge.svg?token=U33MY3DYHK)](https://codecov.io/gh/lsndr/yuow)
[![npm version](https://badge.fury.io/js/yuow.svg?1)](https://badge.fury.io/js/yuow?`)
[![npm downloads/month](https://img.shields.io/npm/dm/yuow.svg)](https://www.npmjs.com/package/yuow)
[![npm downloads](https://img.shields.io/npm/dt/yuow.svg)](https://www.npmjs.com/package/yuow)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lsndr/yuow/blob/master/LICENSE.md)

`Yuow` is a generic implementation of Unit of Work and Repository patterns. It's not a replacement for your current ORM, but a great addition to it especially if you use tactical DDD patterns.

With `Yuow`, you can build a truly isolated domain model.

1. [Quick Start](#quick-start)
2. [Repository](#repository)
3. [Run Options](#run-options)
4. [Versioning](#versioning)
5. [Engine](#engine)
6. [License](#license)

## Quick Start

```
npm install yuow
```

`Yuow` supports [Knex](https://knexjs.org/) out of the box, but you can [integrate with any other database driver or ORM](#engine).
In order to get started, you should implement [Repository](#repository) for each of your models.

This is an example of how to use `Yuow` with Knex:

```typescript
import { Uow, UowContext } from 'yuow/core';
import { KnexEngine } from 'yuow/knex';

const uow = new Uow(new KnexEngine(/* put knex instance here */));

app.use((next) => {
  return UowContext.create(uow, next);
});
```

Then, in your application code, initialize the repository and use it to store your domain entity:

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
  cancelOrder(@Param('id') id: string) {
    const repository = Context.getRepository(OrderRepository);
    const order = await repository.findById(id);

    order.cancel();
  }
}
```

The example above assumes that you already have the `Order` entity and `OrderRepository` implemented. See the [Repository](#repository) section for more details on how to implement a repository.

## Repository

> A Repository mediates between the domain and data mapping layers, acting like an in-memory domain object collection
>
> – [Martin Fowler](https://martinfowler.com/eaaCatalog/repository.html)

In `Yuow`, data mapper and repository responsibilities are merged together for simplicity. However, you are free to encapsulate data mapping logic into a separate class.

To create a repository, you have to extend abstract `Repository` class and implement 4 methods `extractIdentity`, `flushInsert`, `flushUpdate` and `flushDelete`. Also, even though it's not required, you should write your own selection methods:

```typescript
import { Repository } from 'yuow/core';
import { type KnexTransaction } from 'yuow/knex';

export class OrderRepository extends Repository<Order, KnexTransaction> {
  async find(id: string) {
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

To emulate a collection-like behavior, a repository uses the Identity Map pattern to keep identity <–> entity references. Since, with `Yuow`, your domain model can live truly isolated, it's necessary to provide the repository with information on how to extract identity from your entity:

```typescript
protected extractIdentity(order: Order) {
  return order.id;
}
```

### Selection

To load an entity from database, you should create a method that hydrates your entity and returns it. Usually, it's enough to have a single method that returns an entity by its identity, but you can implement any selection methods you need.

In this example, we create a `find` method that returns an `Order` entity or `undefined`:

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
  return this.changeTracker.getTrackedOrTrack(order, EntityState.LOADED);
}
```

### flushInsert, flushDelete, flushUpdate

Insert, delete, and update methods are necessary to persist your domain model state.

These methods are fairly straightforward and structurally similar. The example above lacks concurrency control logic, so it's up to you to implement if needed. You can use database mechanisms like row-level locks or implement [versioning](#versioning).

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

It's necessary to always return a boolean result indicating whether the operation was successful. Depending on the result, `Yuow` decides whether to throw a `PersistenceError` and retry the operation.

## Run Options

```typescript
@Transactional({
  retries: 3,
  transaction: { /* transaction options */ }
})
createOrder() { /* ... */ }
```

### retries

`retries` specifies how many times the unit of work must be retried before it throws an error. Retries are performed only if a `PersistenceError` is thrown. Check out the [Repository](#repository) section to learn when it's thrown.

This is useful when you use a `version` field for optimistic concurrency control.

### transaction

`transaction` is an object that contains transaction options. Its structure depends on the [engine](#engine) you use. For example, if you use `KnexEngine`, it should contain the `isolationLevel` and `global` properties.

```typescript
{
  isolationLevel: 'read committed' | 'repeatable read' | 'serializable',
  global: false
}
```

## Versioning

`Yuow` provides a simple versioning utility to help you to handle optimistic concurrency control:

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
    const version = this.versionTracker.increaseVersion(order); // Call it in order to get new increased version number

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

## Engine

An `Engine` in` Yuow` abstracts the underlying transaction mechanism, allowing you to plug in different database drivers or ORMs while keeping your domain logic decoupled from persistence details.

The `Engine` is responsible for creating and managing transactions, which are then used by repositories to persist changes.

Out of the box, `Yuow` provides a `KnexEngine` that integrates with [Knex.js](https://knexjs.org/). You can use it as a starting point to implement your own engine for other database drivers or ORMs.

## License

Yuow is [MIT licensed](LICENSE.md).
