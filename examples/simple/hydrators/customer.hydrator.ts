import { Customer, CustomerState } from '../model/customer';

export class CustomerHydrator extends Customer {
  constructor(state: CustomerState) {
    super(state);
  }
}
