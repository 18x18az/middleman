import { CookieJar } from 'tough-cookie'
import axios, { AxiosInstance } from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import EventEmitter from 'events'
import { JSDOM } from 'jsdom'
import { sendConnectionState } from '../utils/talos'
import { ConnectionState } from '@18x18az/rosetta'

class AdminServer {
  private state: ConnectionState
  private readonly jar: CookieJar
  private readonly client: AxiosInstance
  private password: string | null
  private readonly connectionBus: EventEmitter

  constructor () {
    this.connectionBus = new EventEmitter()
    this.password = null
    this.state = ConnectionState.IDLE
    this.jar = new CookieJar()
    this.client = wrapper(axios.create({ jar: this.jar }))

    this.addConnectionCb(ConnectionState.AUTH, this._onInvalidPassword.bind(this))
    this.addConnectionCb(ConnectionState.DOWN, this._onTmDisconnect.bind(this))
  }

  addConnectionCb (state: ConnectionState, cb: () => Promise<void>): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.connectionBus.on(state, async () => {
      await cb()
    })
  }

  async _onInvalidPassword (): Promise<void> {
    console.log('Invalid password')
    this.password = null
  }

  async _onTmDisconnect (): Promise<void> {
    if (this.state !== ConnectionState.DOWN) {
      console.log('TM Webserver has gone down')
      console.log('Attempting to reconnect')
    }

    // Wait a second between connection attempts to not spam the server
    await new Promise(resolve => setTimeout(resolve, 1000))

    await this._connect()
  }

  async getData (path: string): Promise<any> {
    await this._getConnection()
    try {
      const url = `http://localhost/${path}`
      const { data } = await this.client.get(url)
      return data
    } catch {
      await this._setConnectionState(ConnectionState.DOWN)
      return await this.getData(path)
    }
  }

  async getDom (path: string): Promise<JSDOM> {
    const data = await this.getData(path)
    const dom = new JSDOM(data)
    return dom
  }

  async getTable (path: string): Promise<any[]> {
    const dom = await this.getDom(path)
    const table = Array.from((dom.window.document.querySelector('tbody') as HTMLTableSectionElement).rows)
    return table
  }

  async _getConnection (): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return
    }

    await new Promise(resolve => this.connectionBus.once(ConnectionState.CONNECTED, resolve))
  }

  async _setConnectionState (state: ConnectionState): Promise<void> {
    this.connectionBus.emit(state)
    this.state = state
    sendConnectionState('web', state)
  }

  async setPassword (password: string): Promise<void> {
    console.log('Attempting to connect to TM Webserver')
    if (this.state !== ConnectionState.AUTH && this.state !== ConnectionState.IDLE) {
      console.log("WARN: Attempted to set the web server password when it shouldn't")
    }

    this.password = password
    await this._connect()
  }

  async _connect (): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      console.log('WARN: Tried to connect to TM Webserver when it was already connected')
      return
    }

    if (this.password === null) {
      await this._setConnectionState(ConnectionState.AUTH)
      return
    }
    try {
      const response = await this.client.post(
                `http://localhost/admin/login?user=admin&password=${this.password}`
      )

      const responseBody = String(response.data)
      if (responseBody.includes('Invalid username or password!')) {
        console.log('Authentication error on TM Webserver')
        await this._setConnectionState(ConnectionState.AUTH)
      } else {
        console.log('Connection to TM Webserver established')
        await this._setConnectionState(ConnectionState.CONNECTED)
      }
    } catch {
      await this._setConnectionState(ConnectionState.DOWN)
    }
  }
}

export const adminServer = new AdminServer()
