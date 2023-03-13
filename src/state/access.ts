import { getEventName } from "../dao/eventName";
import { adminServer } from "../repository/tmWebserver";
import { getSetting, setSetting } from "../repository/settings";
import { tmDatabase } from "../repository/tmDatabase";

const WEB_SERVER_PASSWORD_KEY = "WebServerPassword";
const DB_FILENAME = "DatabaseFilename";

async function setupTmWebserver() {
    const storedWebserverPassword = await getSetting(WEB_SERVER_PASSWORD_KEY, "test");
    adminServer.setPassword(storedWebserverPassword);
}

async function setupTmDatabase() {
    const eventName = await getEventName();

    const storedDbFilename = await (getSetting(DB_FILENAME, "C:\\Users\\alecm\\Documents\\rework.db"));
    tmDatabase.loadDatabase(storedDbFilename, eventName)
}

export async function setup() {
    setupTmWebserver();
    setupTmDatabase();
}

export async function setAdminPassword(password: string) {
    adminServer.setPassword(password);
    setSetting(WEB_SERVER_PASSWORD_KEY, password);
}

export async function setDatabaseFilename(filename: string) {
    const eventName = await getEventName();
    tmDatabase.loadDatabase(filename, eventName);
    setSetting(DB_FILENAME, filename);
}
