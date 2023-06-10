import { getEventName } from '../dao/eventName'
import { adminServer } from '../repository/tmWebserver'
import { getSetting, setSetting } from '../repository/settings'
import { tmDatabase } from '../repository/tmDatabase'
import { tmMobile } from '../repository/tmMobile'

const WEB_SERVER_PASSWORD_KEY = 'WebServerPassword'
const TM_MOBILE_TOKEN = 'TmMobileToken'
const TM_MOBILE_NAME = 'TmMobileName'
const DB_FILENAME = 'DatabaseFilename'

async function setupTmWebserver (): Promise<void> {
  const storedWebserverPassword = await getSetting(WEB_SERVER_PASSWORD_KEY, 'test')
  void adminServer.setPassword(storedWebserverPassword)
}

async function setupTmDatabase (): Promise<void> {
  const eventName = await getEventName()

  const storedDbFilename = await (getSetting(DB_FILENAME, 'C:\\Users\\alecm\\Documents\\rework.db'))
  void tmDatabase.loadDatabase(storedDbFilename, eventName)
}

async function setupTmMobile (): Promise<void> {
  const storedToken = await getSetting(TM_MOBILE_TOKEN, '')
  const storedDeviceName = await getSetting(TM_MOBILE_NAME, '')
  void tmMobile.loadConnection(storedDeviceName, storedToken, setTmMobileAuthorization)
}

export async function setup (): Promise<void> {
  await Promise.allSettled([
    setupTmWebserver(),
    setupTmDatabase(),
    setupTmMobile()
  ])
}

export async function setTmMobileAuthorization (name: string, token: string): Promise<void> {
  await setSetting(TM_MOBILE_NAME, name)
  await setSetting(TM_MOBILE_TOKEN, token)
}

export async function setAdminPassword (password: string): Promise<void> {
  await adminServer.setPassword(password)
  await setSetting(WEB_SERVER_PASSWORD_KEY, password)
}

export async function setDatabaseFilename (filename: string): Promise<void> {
  const eventName = await getEventName()
  await tmDatabase.loadDatabase(filename, eventName)
  await setSetting(DB_FILENAME, filename)
}
