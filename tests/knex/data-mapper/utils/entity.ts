export type EntityState = {
  id: string;
  name: string;
};

export class Entity {
  private readonly state: EntityState;

  get id() {
    return this.state.id;
  }

  get name() {
    return this.state.name;
  }

  public constructor(state: EntityState) {
    this.state = state;
  }

  public changeName(name: string) {
    this.state.name = name;
  }
}
