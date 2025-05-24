import type { Engine } from './engine';
import type { Transaction } from './transaction';

export type InferEngineTransaction<E> =
  E extends Engine<infer T, any, any> ? T : never;

export type InferTransactionEvents<T, D = never> =
  T extends Transaction<infer E> ? E : D;

export type InferTransactionOptions<E> =
  E extends Engine<any, infer TO, any> ? TO : never;
