export type CustomerState = {
  id: string;
  name: string;
};

export class Customer {
  private state: CustomerState;

  get id() {
    return this.state.id;
  }

  get name() {
    return this.state.name;
  }

  protected constructor(state: CustomerState) {
    this.state = state;
  }

  changeName(name: string) {
    this.state.name = name;
  }

  static create(id: string, name: string) {
    return new this({
      id,
      name,
    });
  }
}
