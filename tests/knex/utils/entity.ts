export type EntityState = {
  id: string;
  name: string;
  cards: string[];
};

export class Entity {
  private state: EntityState;

  get id() {
    return this.state.id;
  }

  get name() {
    return this.state.name;
  }

  get cards() {
    return this.state.cards;
  }

  protected constructor(state: EntityState) {
    this.state = state;
  }

  changeName(name: string) {
    this.state.name = name;
  }

  static create(state: EntityState) {
    return new this(state);
  }
}
