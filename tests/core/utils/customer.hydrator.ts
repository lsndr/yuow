import type { CustomerState } from './customer';
import { Customer } from './customer';

export class CustomerHydrator extends Customer {
  public constructor(state: CustomerState) {
    super(state);
  }
}
