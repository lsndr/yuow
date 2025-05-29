import { faker } from '@faker-js/faker';

export interface EntityState {
  id: string;
  name: string;
  cards: string[];
}

export class Entity {
  public id: string;
  public name: string;
  public cards: string[];

  public constructor(state: EntityState) {
    this.id = state.id;
    this.name = state.name;
    this.cards = state.cards;
  }

  public static generate(): Entity {
    return new Entity({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      cards: [
        faker.finance.accountNumber(),
        faker.finance.accountNumber(),
        faker.finance.accountNumber(),
      ],
    });
  }
}
