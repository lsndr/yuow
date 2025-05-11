import { Customer, CustomerState } from './customer';

export class CustomerHydrator extends Customer {
  constructor(state: CustomerState) {
    super(state);
  }
}
