import type { Engine } from '../core';
import {
  PrismaTransaction,
  type PrismaClientLike,
  type PrismaTransactionOptions,
} from './prisma-transaction';

export class PrismaEngine<
  TClient extends PrismaClientLike,
  TIsolationLevel,
> implements Engine<
  PrismaTransaction<TClient, TIsolationLevel>,
  PrismaTransactionOptions<TIsolationLevel>
> {
  public constructor(private readonly prisma: TClient) {}

  public async createTransaction(
    options?: PrismaTransactionOptions<TIsolationLevel>,
  ): Promise<PrismaTransaction<TClient, TIsolationLevel>> {
    const transaction = new PrismaTransaction<TClient, TIsolationLevel>(
      this.prisma,
      options,
    );

    if (options?.global) {
      await transaction.begin();
    }

    return transaction;
  }
}
