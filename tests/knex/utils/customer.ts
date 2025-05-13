export type CustomerState = {
  id: string;
  name: string;
  cards: string[];
};

export class Customer {
  private state: CustomerState;

  get id() {
    return this.state.id;
  }

  get name() {
    return this.state.name;
  }

  get cards() {
    return this.state.cards;
  }

  protected constructor(state: CustomerState) {
    this.state = state;
  }

  changeName(name: string) {
    this.state.name = name;
  }

  static create(state: CustomerState) {
    return new this(state);
  }
}
