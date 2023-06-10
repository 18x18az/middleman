import EventEmitter from 'events'
import { existsSync } from 'fs'
import { open } from 'sqlite'
import { Database } from 'sqlite3'

export enum DatabaseState {
  IDLE = 'IDLE',
  WRONG_FILE = 'FILE',
  ESTABLISHED = 'ESTABLISHED'
}

class TmDatabase {
  filename: string
  state: DatabaseState
  databaseBus: EventEmitter

  constructor () {
    this.filename = ''
    this.state = DatabaseState.IDLE
    this.databaseBus = new EventEmitter()
  }

  async __getDb () {
    return await open({
      filename: this.filename,
      driver: Database
    })
  }

  async _setDatabaseState (state: DatabaseState) {
    this.databaseBus.emit(state)
    this.state = state
  }

  async loadDatabase (filename: string, eventName: string) {
    console.log('Attempting to load TM database')
    if (!existsSync(filename)) {
      console.log(`TM Database ${filename} does not exist`)
      this._setDatabaseState(DatabaseState.WRONG_FILE)
      return
    }
    this.filename = filename
    const dbEventName = (await this._getSingle('config', 'id', '101')).value

    if (dbEventName !== eventName) {
      console.log(`Event name mismatch for TM db ${filename}`)
      this._setDatabaseState(DatabaseState.WRONG_FILE)
      return
    }

    console.log('TM Database loaded')
    this._setDatabaseState(DatabaseState.ESTABLISHED)
  }

  async _getSingle (table: string, selector: string, value: any) {
    const db = await this.__getDb()

    const result = await db.get(`SELECT * FROM '${table}' WHERE ${selector} = ?`, value)
    await db.close()

    return result
  }

  async _getDb () {
    if (this.state !== DatabaseState.ESTABLISHED) {
      await new Promise(resolve => this.databaseBus.once(DatabaseState.ESTABLISHED, resolve))
    }

    return await this.__getDb()
  }

  async getAll (table: string) {
    const db = await this._getDb()

    const result = await db.all(`SELECT * FROM ${table}`)

    await db.close()

    return result
  }
}

export const tmDatabase = new TmDatabase()
