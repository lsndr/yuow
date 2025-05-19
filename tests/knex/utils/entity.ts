export type EntityState = {
  id: string;
  name: string;
  cards: string[];
};

export class Entity {
  private state: EntityState;

  public constructor(state: EntityState) {
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

  public changeName(name: string): void {
    this.state.name = name;
  }
}
