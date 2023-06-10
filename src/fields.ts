import { FIELD_CONTROL, IFieldState, IFieldInfo, IPath, FIELD_COMMAND } from '@18x18az/rosetta'
import { WebSocket } from 'ws'
import { talos } from './index'
import { tm } from './request'

const currentFieldState: IFieldState = {
  field: '0',
  control: FIELD_CONTROL.DISABLED,
  timeRemaining: 0,
  match: 'None'
}

let currentFieldInfo: IFieldInfo[]

export async function getFieldInfo (fieldset: string): Promise<IFieldInfo[]> {
  const { fields } = await tm.getData(`fieldsets/${fieldset}/fields`)
  const fieldsInfo = fields.map((field: any) => {
    const { id, name } = field
    const fieldInfo: IFieldInfo = { field: id, name }
    return fieldInfo
  })

  currentFieldInfo = fieldsInfo

  return fieldsInfo
}

export function getStaleFieldState (): IFieldState {
  return currentFieldState
}

export function getStaleFieldInfo (): IFieldInfo[] {
  return currentFieldInfo
}

let ws: WebSocket

export function resetWs () {
  ws.close()
}

export async function doSocketStuff (fieldset: string) {
  ws = await tm.getFieldControlSocket(fieldset)

  ws.on('open', function open () {
    console.log('Started TM socket')
  })

  ws.on('message', function message (data) {
    console.log('received: %s', data)
    const info = JSON.parse(data.toString())
    const type = info.type
    if (type === 'timeUpdated') {
      const period = info.period_name
      if (period === 'Autonomous') {
        currentFieldState.control = FIELD_CONTROL.AUTONOMOUS
      } else if (period === 'Driver Control') {
        currentFieldState.control = FIELD_CONTROL.DRIVER
      } else if (info.state === 'TIMEOUT') {
        currentFieldState.control = FIELD_CONTROL.TIMEOUT
      } else if (period === '') {
        currentFieldState.control = FIELD_CONTROL.DISABLED
      }

      currentFieldState.timeRemaining = info.remaining
    } else if (type === 'matchPaused') {
      currentFieldState.timeRemaining = 0
      currentFieldState.control = FIELD_CONTROL.PAUSED
    } else if (type === 'matchStopped') {
      currentFieldState.timeRemaining = 0
      currentFieldState.control = FIELD_CONTROL.DISABLED
    } else if (type === 'matchAborted') {
      currentFieldState.timeRemaining = 0
      currentFieldState.control = FIELD_CONTROL.DISABLED
    } else if (type === 'timerReset') {
      currentFieldState.field = info.fieldId
    } else if (type === 'fieldMatchAssigned') {
      currentFieldState.match = info.name
    }
    console.log(currentFieldState)
    talos.post(['field', currentFieldState.field], currentFieldState)
  })

  ws.on('close', async function close () {
    console.log('TM connection lost, attempting to reconnect')
    await doSocketStuff(fieldset)
  })
}

/**
 *
 * @param fieldset the fieldset to connect to
 * @param type can be either NextMatch, PrevMatch, Driver, Programming
 */
async function queueMatch (fieldset: string, type: CONTROL_QUEUE) {
  const validActions: string[] = ['NextMatch', 'PrevMatch', 'Driver', 'Programming']

  if (validActions.includes(type)) {
    ws.send(JSON.stringify({
      action: 'queue' + type
    }))
    console.log(`fieldcontrol: queuing ${type}`)
  } else {
    console.log(`fieldcontrol: queuing ${type} not supported`)
  }
}

async function controlMatch (fieldset: string, type: CONTROL_MATCH) {
  if (type === 'start') {
    console.log('starting match!')
    console.log({
      action: type,
      fieldId: currentFieldState.field
    })
    // TODO: when something (like middleman) restarts,
    // fieldID = 0. However fieldIDs start at 1.
    // do something about it
    ws.send(JSON.stringify({
      action: type,
      fieldId: currentFieldState.field
    }))
  }
}

export enum CONTROL_TYPE {
  QUEUE = 'QUEUE',
  MATCH = 'MATCH'
}

export enum CONTROL_QUEUE {
  COMP_NEXT = 'NextMatch',
  COMP_PREV = 'PrevMatch',
  SKILLS_DRIVER = 'Driver',
  SKILLS_PROGRAMMING = 'Programming'
}

export enum CONTROL_MATCH {
  START = 'start'
}

export interface IFieldControl {
  type: CONTROL_TYPE
  action: CONTROL_QUEUE | CONTROL_MATCH
  fieldID: string
}

export async function postFieldCommandHandler (fieldset: string, path: IPath, payload: FIELD_COMMAND) {
  console.log('field control post handler')
  console.log(payload)
  if (payload === FIELD_COMMAND.QUEUE_NEXT) {
    await queueMatch(fieldset, CONTROL_QUEUE.COMP_NEXT)
  } else if (payload === FIELD_COMMAND.START_MATCH) {
    await controlMatch(fieldset, CONTROL_MATCH.START)
  }
}
