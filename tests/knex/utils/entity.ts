export type EntityState = {
  id: string;
  name: string;
  cards: string[];
};

export class Entity {
  private state: EntityState;

  protected constructor(state: EntityState) {
    this.state = state;
  }

  public get id(): string {
    return this.state.id;
  }

  public get name(): string {
    return this.state.name;
  }

  public get cards(): string[] {
    return this.state.cards;
  }

  public static create(state: EntityState): Entity {
    return new this(state);
  }

  public changeName(name: string): void {
    this.state.name = name;
  }
}
