import { open } from 'sqlite'
import { Database } from 'sqlite3'

interface ISettings {
  [key: string]: string
}

const settings: ISettings = {}

export async function getSetting (name: string, fallback: string): Promise<string> {
  const setting = settings[name]

  if (setting === undefined) {
    const val = await readSetting(name, fallback)
    settings[name] = val
    return val
  }

  return setting
}

export async function setSetting (name: string, val: string): Promise<void> {
  settings[name] = val
  await updateSetting(name, val)
}

async function updateSetting (name: string, val: string): Promise<void> {
  const db = await open({
    filename: 'config.db',
    driver: Database
  })

  await db.run(`UPDATE settings SET value = '${val}' WHERE name = '${name}'`)
  await db.close()
}

async function createSetting (name: string, val: string): Promise<void> {
  const db = await open({
    filename: 'config.db',
    driver: Database
  })

  await db.run('INSERT INTO settings (name, value) VALUES (?, ?)', name, val)
  await db.close()
}

async function readSetting (name: string, fallback: string): Promise<string> {
  const db = await open({
    filename: 'config.db',
    driver: Database
  })

  try {
    const result = await db.get('SELECT value FROM settings WHERE name = ?', name)
    if (result !== undefined) {
      await db.close()
      return result.value
    }
  } catch (error) {
    console.log('Setting up config DB')
    await db.run('CREATE TABLE settings (name TEXT PRIMARY KEY, value TEXT)')
  };

  await db.close()

  console.log(`Populating default value for setting ${name}`)
  await createSetting(name, fallback)

  return fallback
}
