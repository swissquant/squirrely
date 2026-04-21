import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'prices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('ticker', 32).notNullable()
      table.string('date', 10).notNullable()
      table.double('close').notNullable()
      table.unique(['ticker', 'date'])
      table.index(['ticker', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
