import { adminServer } from '../repository/tmWebserver'

export async function getEventName (): Promise<string> {
  const dom = await adminServer.getDom('')
  const name = dom.window.document.getElementsByClassName('navbar-brand')[0].textContent
  return name || ''
}
