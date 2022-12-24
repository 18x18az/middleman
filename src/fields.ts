import { FIELD_CONTROL, IFieldState, IFieldInfo, IPath } from "@18x18az/rosetta"
import { WebSocket } from "ws";
import { talos } from "./index"
import { tm } from "./request";

let currentFieldState: IFieldState = {
    field: "0",
    control: FIELD_CONTROL.DISABLED,
    timeRemaining: 0,
    match: "None"
}

let currentFieldInfo: Array<IFieldInfo>;

export async function getFieldInfo(fieldset: string): Promise<Array<IFieldInfo>> {
    const {fields} = await tm.getData(`fieldsets/${fieldset}/fields`)
    const fieldsInfo = fields.map((field: any) => {
        const {id, name} = field;
        const fieldInfo: IFieldInfo = {field: id, name};
        return fieldInfo;
    });

    currentFieldInfo = fieldsInfo;

    return fieldsInfo;
}

export function getStaleFieldState(): IFieldState {
    return currentFieldState;
}

export function getStaleFieldInfo(): Array<IFieldInfo>{
    return currentFieldInfo;
}

let ws: WebSocket;

export function resetWs(){
    ws.close();
}

export async function doSocketStuff(fieldset: string) {
    ws = await tm.getFieldControlSocket(fieldset);

    ws.on('open', function open() {
        console.log('connected');
    });

    ws.on('message', function message(data) {
        console.log('received: %s', data);
        const info = JSON.parse(data.toString())
        const type = info.type;
        if (type === "timeUpdated") {
            const period = info.period_name;
            if (period === "Autonomous") {
                currentFieldState.control = FIELD_CONTROL.AUTONOMOUS
            } else if (period === "Driver Control") {
                currentFieldState.control = FIELD_CONTROL.DRIVER
            } else if (info.state === "TIMEOUT") {
                currentFieldState.control = FIELD_CONTROL.TIMEOUT
            } else if (period === "") {
                currentFieldState.control = FIELD_CONTROL.DISABLED
            }

            currentFieldState.timeRemaining = info.remaining;
        } else if (type === "matchPaused") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FIELD_CONTROL.PAUSED;
        } else if (type === "matchStopped") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FIELD_CONTROL.DISABLED;
        } else if (type === "matchAborted") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FIELD_CONTROL.DISABLED;
        } else if (type === "timerReset") {
            currentFieldState.field = info.fieldId;
        } else if (type === "fieldMatchAssigned") {
            currentFieldState.match = info.name;
        }
        console.log(currentFieldState);
        talos.post(["field", currentFieldState.field], currentFieldState);
    });

    ws.on('close', async function close() {
        console.log('Attempting to reconnect');
        await doSocketStuff(fieldset);
    });
}

/**
 * 
 * @param fieldset the fieldset to connect to
 * @param type can be either NextMatch, PrevMatch, Driver, Programming
 */
async function queueMatch(fieldset: string, type: CONTROL_QUEUE) {
    let validActions: string[] = ["NextMatch", "PrevMatch", "Driver", "Programming"];

    if (validActions.includes(type)) {
        ws.send(JSON.stringify({
            "action": "queue" + type
        }));
        console.log(`fieldcontrol: queuing ${type}`);
    }
    else {
        console.log(`fieldcontrol: queuing ${type} not supported`);
    }
}

async function controlMatch(fieldset: string, type: CONTROL_MATCH, fieldID: string) {
    if (type === "start") {
        console.log("starting match!");
        console.log({
            "action": type,
            "fieldId": fieldID
        })
        // TODO: when something (like middleman) restarts,
        // fieldID = 0. However fieldIDs start at 1.
        // do something about it
        ws.send(JSON.stringify({
            "action": type,
            "fieldId": fieldID
        }));
    }
}

export enum CONTROL_TYPE {
    QUEUE = "QUEUE",
    MATCH = "MATCH"
}

export enum CONTROL_QUEUE {
    COMP_NEXT = "NextMatch",
    COMP_PREV = "PrevMatch",
    SKILLS_DRIVER = "Driver",
    SKILLS_PROGRAMMING = "Programming"
}

export enum CONTROL_MATCH {
    START = "start"
}

export interface IFieldControl {
    type: CONTROL_TYPE
    action: CONTROL_QUEUE | CONTROL_MATCH
    fieldID: string
}

export async function postFieldControlHandler(fieldset: string, path: IPath, payload: IFieldControl) {
    console.log("field control post handler");
    console.log(payload);
    if (payload.type === CONTROL_TYPE.QUEUE) {
        queueMatch(fieldset, payload.action as CONTROL_QUEUE);
    }
    else if (payload.type === CONTROL_TYPE.MATCH) {
        controlMatch(fieldset, payload.action as CONTROL_MATCH, payload.fieldID);
    }
}