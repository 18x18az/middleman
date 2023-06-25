import { ConnectionState } from '@18x18az/rosetta'
import EventEmitter from 'events'
import { existsSync } from 'fs'
import { open, Database } from 'sqlite'
import { sendConnectionState } from '../utils/talos'

class TmDatabase {
  filename: string
  state: ConnectionState
  databaseBus: EventEmitter

  constructor () {
    this.filename = ''
    this.state = ConnectionState.IDLE
    this.databaseBus = new EventEmitter()
  }

  async __getDb (): Promise<Database> {
    return await open({
      filename: this.filename,
      driver: Database
    })
  }

  async _setDatabaseState (state: ConnectionState): Promise<void> {
    this.databaseBus.emit(state)
    this.state = state
    sendConnectionState('database', state)
  }

  async loadDatabase (filename: string, eventName: string): Promise<void> {
    console.log('Attempting to load TM database')
    if (!existsSync(filename)) {
      console.log(`TM Database ${filename} does not exist`)
      await this._setDatabaseState(ConnectionState.DOWN)
      return
    }
    this.filename = filename
    const dbEventName = (await this._getSingle('config', 'id', '101')).value

    if (dbEventName !== eventName) {
      console.log(`Event name mismatch for TM db ${filename}`)
      await this._setDatabaseState(ConnectionState.DOWN)
      return
    }

    console.log('TM Database loaded')
    await this._setDatabaseState(ConnectionState.CONNECTED)
  }

  async _getSingle (table: string, selector: string, value: any): Promise<any> {
    const db = await this.__getDb()

    const result = await db.get(`SELECT * FROM '${table}' WHERE ${selector} = ?`, value)
    await db.close()

    return result
  }

  async _getDb (): Promise<Database> {
    if (this.state !== ConnectionState.CONNECTED) {
      await new Promise(resolve => this.databaseBus.once(ConnectionState.CONNECTED, resolve))
    }

    return await this.__getDb()
  }

  async getAll (table: string): Promise<any> {
    const db = await this._getDb()

    const result = await db.all(`SELECT * FROM ${table}`)

    await db.close()

    return result
  }
}

export const tmDatabase = new TmDatabase()
