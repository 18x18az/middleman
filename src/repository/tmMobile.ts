import axios, { AxiosInstance } from "axios";
import { Agent } from "https";
import { wrapper } from "axios-cookiejar-support";
import EventEmitter from "events";
import { createHmac } from "crypto";

const BASE_PATH = "https://localhost:5443"
const API_ADDON = "/api/v2"
const API_PATH = `${BASE_PATH}${API_ADDON}`

export enum ConnectionState {
    IDLE = "IDLE",
    AWAITING_AUTH = "AUTH",
    TM_DOWN = "DOWN",
    CONNECTED = "CONNECTED"
}

export enum ConnectionStatus {
    OFFLINE = "OFFLINE",
    UNAUTHORIZED = "AUTH",
    DISABLED = "DISABLED",
    GOOD = "GOOD"
}

class TmMobile {
    private state: ConnectionState;
    private client: AxiosInstance;
    private token: string;
    private authCodeInvalid: number;
    private connectionBus: EventEmitter;
    private authCode: number | null;
    private deviceId: string;
    private saveAuthorization?: (name: string, token: string) => void;

    constructor() {
        this.connectionBus = new EventEmitter();
        this.token = '';
        this.state = ConnectionState.IDLE;
        this.authCode = null;
        this.client = wrapper(axios.create());
        this.deviceId = '';
        this.saveAuthorization;
        this.authCodeInvalid = Date.now();

        this.addConnectionCb(ConnectionState.AWAITING_AUTH, this._establishConnection.bind(this));
    }

    addConnectionCb(state: ConnectionState, cb: () => void) {
        this.connectionBus.on(state, cb);
    }

    async _regenerateAuthCode(): Promise<void> {
        if (this.state === ConnectionState.CONNECTED) {
            return;
        }

        const httpsAgent = new Agent({
            rejectUnauthorized: false, // (NOTE: this will disable client verification)
        });

        const url = `${API_PATH}/devices/`
        const response = await this.client.post(url, { deviceName: "talos" }, { httpsAgent });
        this.token = response.data.deviceToken;
        this.authCode = response.data.tempCode;
        this.deviceId = response.data.deviceId;
        const timeout = response.data.tempCodeTimeout;
        this.authCodeInvalid = Date.now() + timeout * 1000;

        console.log(`Got new TM mobile authorization code ${this.authCode}`);
    }

    _makeHeaders(path: string, method: string, contentLength: number) {
        const date = new Date().toUTCString();
        const contentType = 'application/json';
        const acceptHeader = 'application/json';
        const encodedPath = `${API_ADDON}/${path}`

        const payload = `${this.deviceId}${method}${encodedPath}${date}${contentType}${contentLength}${acceptHeader}`

        const signature = createHmac('sha256', this.token).update(payload).digest('hex');

        const headers = {
            'Authorization': `TMAPI ${this.deviceId} ${signature}`,
            'Content-Type': contentType,
            'Content-Length': `${contentLength}`,
            'Accept': acceptHeader,
            'Date': date
        }

        return headers;
    }

    async get(path: string): Promise<any> {
        const url = `${API_PATH}/${path}`;

        const headers = this._makeHeaders(path, 'GET', 0);
        const httpsAgent = new Agent({
            rejectUnauthorized: false
        });

        try {
            const response = await this.client.get(url, { headers, httpsAgent });
            return response.data;
        } catch (error: any) {
            //console.log(error.response.data);
        }
        return null;
    }

    async loadConnection(name: string, token: string, saveCb: (name: string, token: string) => void) {
        this.saveAuthorization = saveCb;
        console.log("Attempting to connect to TM mobile");

        if (!name) {
            await this._regenerateAuthCode();
        } else {
            this.deviceId = name;
            this.token = token;
        }

        this._establishConnection();
    }

    async _checkConnection(): Promise<ConnectionStatus> {
        const url = `${API_PATH}/game/default`
        const headers = this._makeHeaders('game/default', 'GET', 0);
        const httpsAgent = new Agent({
            rejectUnauthorized: false
        });

        try {
            await this.client.get(url, { headers, httpsAgent });
            return ConnectionStatus.GOOD;
        } catch (err: any) {
            const error = err?.response?.data?.error;

            if (error === "DEVICE_DISABLED") {
                return ConnectionStatus.DISABLED
            } else if (error === "DEVICE_UNKNOWN") {
                return ConnectionStatus.UNAUTHORIZED;
            } else {
                return ConnectionStatus.OFFLINE;
            }
        }
    }

    async _establishConnection(): Promise<void> {

        while (true) {
            if (this.state === ConnectionState.CONNECTED) {
                return;
            }

            const status = await this._checkConnection();

            if (status === ConnectionStatus.GOOD) {
                console.log("Connection to TM Mobile established");
                if (this.saveAuthorization) {
                    this.saveAuthorization(this.deviceId, this.token);
                }
                this._setConnectionState(ConnectionState.CONNECTED);
                return;
            }

            if (status === ConnectionStatus.UNAUTHORIZED) {
                if (Date.now() > this.authCodeInvalid) {
                    this._regenerateAuthCode();
                }
            }

            await new Promise(r => setTimeout(r, 1000));
        }
    }

    async _getConnection(): Promise<void> {
        if (this.state === ConnectionState.CONNECTED) {
            return
        }

        await new Promise(resolve => this.connectionBus.once(ConnectionState.CONNECTED, resolve));
    }

    async _setConnectionState(state: ConnectionState) {
        this.state = state;
        this.connectionBus.emit(state);
    }
}

export const tmMobile = new TmMobile();
