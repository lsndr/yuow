import type { Engine } from './engine';
import type { Transaction } from './transaction';

export type InferEngineTransaction<E> =
  E extends Engine<infer T, any, any> ? T : never;

export type InferTransactionEvents<T> =
  T extends Transaction<infer E> ? E : never;

export type InferTransactionOptions<E> =
  E extends Engine<any, infer TO, any> ? TO : never;
