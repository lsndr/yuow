# Yuow

[![npm version](https://badge.fury.io/js/yuow.svg)](https://badge.fury.io/js/yuow)
[![npm downloads/month](https://img.shields.io/npm/dm/yuow.svg)](https://www.npmjs.com/package/yuow)
[![npm downloads](https://img.shields.io/npm/dt/yuow.svg)](https://www.npmjs.com/package/yuow)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/lsndr/yuow/blob/master/LICENSE.md)

`Yuow` is a generic implementation of Unity of Work, Repository and IdentityMap patterns built on top of Knex library.

With `yuow` you can build a truly isolated domain model.

## Usage

```
  npm install yuow 
```

```typescript
  app.post('/update-name', async (userId: string, name: string) => {
    return uow(async (ctx) => {
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
  });
```

## Examples

TODO


## License

Yuow is [MIT licensed](LICENSE.md).