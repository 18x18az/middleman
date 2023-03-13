import { CookieJar } from "tough-cookie";
import axios, { AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import EventEmitter from "events";
import { JSDOM } from "jsdom";

export enum ConnectionState {
    IDLE = "IDLE",
    INVALID_PASSWORD = "PASSWORD",
    TM_DOWN = "DOWN",
    CONNECTED = "CONNECTED"
}

class AdminServer {
    private state: ConnectionState;
    private jar: CookieJar;
    private client: AxiosInstance;
    private password: string | null;
    private connectionBus: EventEmitter;

    constructor() {
        this.connectionBus = new EventEmitter();
        this.password = null;
        this.state = ConnectionState.IDLE;
        this.jar = new CookieJar();
        this.client = wrapper(axios.create({ jar: this.jar }));

        this.addConnectionCb(ConnectionState.INVALID_PASSWORD, this._onInvalidPassword.bind(this));
        this.addConnectionCb(ConnectionState.TM_DOWN, this._onTmDisconnect.bind(this));
    }

    addConnectionCb(state: ConnectionState, cb: () => void) {
        this.connectionBus.on(state, cb);
    }

    async _onInvalidPassword() {
        console.log("Invalid password");
        this.password = null;
    }

    async _onTmDisconnect() {
        if (this.state !== ConnectionState.TM_DOWN) {
            console.log("TM Webserver has gone down");
            console.log("Attempting to reconnect");
        }

        await new Promise(r => setTimeout(r, 1000));

        this._connect();
    }

    async getData(path: string): Promise<any> {
        await this._getConnection();
        try {
            const url = `http://localhost/${path}`;
            const { data } = await this.client.get(url);
            return data;
        } catch {
            this._setConnectionState(ConnectionState.TM_DOWN);
            return this.getData(path);
        }

    }

    async getDom(path: string): Promise<JSDOM> {
        const data = await this.getData(path);
        const dom = new JSDOM(data);
        return dom;
    }

    async getTable(path: string): Promise<Array<any>> {
        const dom = await this.getDom(path);
        const table = Array.from((dom.window.document.querySelector('tbody') as HTMLTableSectionElement).rows);
        return table;
    }

    async _getConnection(): Promise<void> {
        if (this.state === ConnectionState.CONNECTED) {
            return
        }

        await new Promise(resolve => this.connectionBus.once(ConnectionState.CONNECTED, resolve));
    }

    async _setConnectionState(state: ConnectionState) {
        this.connectionBus.emit(state);
        this.state = state;
    }

    async setPassword(password: string) {
        console.log("Attempting to connect to TM Webserver")
        if (this.state !== ConnectionState.INVALID_PASSWORD && this.state !== ConnectionState.IDLE) {
            console.log("WARN: Attempted to set the web server password when it shouldn't")
        }

        this.password = password;
        this._connect();
    }

    async _connect(): Promise<void> {
        if (this.state === ConnectionState.CONNECTED) {
            console.log("WARN: Tried to connect to TM Webserver when it was already connected");
            return
        }

        if (this.password === null) {
            this._setConnectionState(ConnectionState.INVALID_PASSWORD);
            return;
        }
        try {
            const response = await this.client.post(
                `http://localhost/admin/login?user=admin&password=${this.password}`
            );

            const responseBody = String(response.data);
            if (responseBody.includes('Invalid username or password!')) {
                console.log("Authentication error on TM Webserver");
                this._setConnectionState(ConnectionState.INVALID_PASSWORD);
            } else {
                console.log("Connection to TM Webserver established");
                this._setConnectionState(ConnectionState.CONNECTED);
            }
        } catch {
            this._setConnectionState(ConnectionState.TM_DOWN);
        }
    }
}

export const adminServer = new AdminServer();
