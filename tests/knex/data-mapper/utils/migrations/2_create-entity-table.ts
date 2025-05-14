import { type Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('entity', (table) => {
    table.uuid('id').primary().unique();
    table.text('name').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('entity');
}
