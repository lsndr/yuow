export type EntityState = {
  id: string;
  name: string;
};

export class Entity {
  private readonly state: EntityState;

  public get id(): string {
    return this.state.id;
  }

  public get name(): string {
    return this.state.name;
  }

  public constructor(state: EntityState) {
    this.state = state;
  }

  public changeName(name: string): void {
    this.state.name = name;
  }
}
