import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().unique();
    table.text('name').notNullable();
    table.smallint('version').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('customers');
}
