import { adminServer } from '../repository/tmWebserver'
import { sendEventName } from '../utils/talos'

let eventName = ''

export async function getEventName (): Promise<string> {
  if (eventName !== '') {
    return eventName
  }

  const dom = await adminServer.getDom('')
  const name = dom.window.document.getElementsByClassName('navbar-brand')[0].textContent ?? ''
  console.log(name)
  eventName = name
  sendEventName(name)
  return name
}
