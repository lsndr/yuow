export type CustomerState = {
  id: string;
  name: string;
  cards: string[];
};

export class Customer {
  private state: CustomerState;

  public get id(): string {
    return this.state.id;
  }

  public get name(): string {
    return this.state.name;
  }

  public get cards(): string[] {
    return this.state.cards;
  }

  protected constructor(state: CustomerState) {
    this.state = state;
  }

  public static create(state: CustomerState): Customer {
    return new this(state);
  }

  public changeName(name: string): void {
    this.state.name = name;
  }
}
