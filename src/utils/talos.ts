import { ConnectionState } from '@18x18az/rosetta'
import * as request from 'request'

const baseUrl = 'http://localhost:1818'

function post (path: string, body: any): void {
  const uri = `${baseUrl}/${path}`
  request.post(uri, { json: body })
}

export function sendEventName (name: string): void {
  post('eventName', { name })
}

export function sendConnectionState (name: string, state: ConnectionState): void {
  post(`state/middleman/${name}`, { state })
}
