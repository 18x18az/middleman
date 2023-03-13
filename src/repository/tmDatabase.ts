import EventEmitter from "events";
import { existsSync } from 'fs';
import { open } from "sqlite";
import { Database } from "sqlite3";

export enum DatabaseState {
    IDLE = "IDLE",
    WRONG_FILE = "FILE",
    ESTABLISHED = "ESTABLISHED"
}

class TmDatabase {
    filename: string
    state: DatabaseState
    databaseBus: EventEmitter

    constructor() {
        this.filename = '';
        this.state = DatabaseState.IDLE;
        this.databaseBus = new EventEmitter();
    }

    async _getDb() {
        return open({
            filename: this.filename,
            driver: Database
        });
    }

    async _setDatabaseState(state: DatabaseState) {
        this.databaseBus.emit(state);
        this.state = state;
    }

    async loadDatabase(filename: string, eventName: string) {
        console.log("Loading database");
        if (!existsSync(filename)) {
            console.log(`Database ${filename} does not exist`);
            this._setDatabaseState(DatabaseState.WRONG_FILE);
            return;
        }
        this.filename = filename;
        const dbEventName = (await this._getSingle('config', 'id', '101'))['value'];

        if (dbEventName !== eventName) {
            console.log(`Event name mismatch for db ${filename}`);
            this._setDatabaseState(DatabaseState.WRONG_FILE);
            return;
        }

        console.log("Database loaded");
        this._setDatabaseState(DatabaseState.ESTABLISHED);
    }

    async _getSingle(table: string, selector: string, value: any) {
        const db = await this._getDb();

        const result = await db.get(`SELECT * FROM '${table}' WHERE ${selector} = ?`, value);
        await db.close();

        return result;
    }

}

export const tmDatabase = new TmDatabase();
