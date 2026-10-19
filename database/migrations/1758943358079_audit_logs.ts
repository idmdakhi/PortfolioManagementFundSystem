import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Audit trail. Two kinds of rows:
 *  - kind='request': every state-changing HTTP request (who, what, from where, outcome)
 *  - kind='change' : before/after snapshot of a financial record that was edited or deleted
 * It is NOT part of the JSON backup on purpose, so a restore can never erase the history.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('audit_logs', (t) => {
      t.increments('id')
      t.string('kind').notNullable()
      t.integer('user_id').nullable()
      t.string('user_email').nullable()
      t.string('method', 10).nullable()
      t.string('path').nullable()
      t.string('action').notNullable()
      t.string('entity').nullable()
      t.string('entity_id').nullable()
      t.text('before').nullable()
      t.text('after').nullable()
      t.text('detail').nullable()
      t.string('outcome').nullable()
      t.string('ip', 64).nullable()
      t.timestamp('created_at').notNullable()
      t.index(['created_at'])
      t.index(['entity', 'entity_id'])
      t.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable('audit_logs')
  }
}
