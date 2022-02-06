import axios, { AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { config } from "dotenv";
import * as jsdom from "jsdom";
import { CookieJar } from "tough-cookie";
import { WebSocket } from "ws";

config();
class TournamentManager {
    private hostname: string;
    private password: string;
    private initializePromise: Promise<boolean> | null;
    private jar: CookieJar;
    private client: AxiosInstance;

    constructor(hostname: string, password: string) {
        this.hostname = hostname;
        this.password = password;
        this.initializePromise = null;
        this.jar = new CookieJar();
        this.client = wrapper(axios.create({ jar: this.jar }))
    }

    async _doInitialize(): Promise<boolean> {
        console.log("Authenticating with Tournament Manager");
        await this.client.post(
            `http://${this.hostname}/admin/login?user=admin&password=${this.password}`
        );
        console.log("Authenticated");
        return true;
    }

    async _initialize() {
        if (!this.initializePromise) {
            this.initializePromise = this._doInitialize();
        }

        return this.initializePromise;
    }

    async _getCookies() {
        await this._initialize();
        return this.jar.toJSON().cookies[0]['value'];
    }

    async getFieldControlSocket(fieldset: string): Promise<WebSocket> {
        const user = await this._getCookies();
        const cookieString = `user=${user}; lastFieldSetId=1"`

        const ws = new WebSocket(`ws://${this.hostname}/fieldsets/${fieldset}`, {
            headers: {
                Cookie: cookieString
            }
        });

        return ws;
    }

    async getData(path: string): Promise<any> {
        await this._initialize();
        const url = `http://${hostname}/${path}`;
        const { data } = await this.client.get(url);
        return data;
    }

    async getDom(path: string): Promise<jsdom.JSDOM> {
        const data = await this.getData(path);
        const dom = new jsdom.JSDOM(data);
        return dom;
    }

    async getTable(path: string): Promise<Array<any>> {
        const dom = await this.getDom(path);
        const table = Array.from(dom.window.document.querySelector('tbody').rows);
        return table;
    }

}

const hostname = process.env.TM_HOSTNAME as string;
const password = process.env.TM_PASSWORD as string;

export const tm = new TournamentManager(hostname, password);
