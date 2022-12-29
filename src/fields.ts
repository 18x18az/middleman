import { FIELD_CONTROL, IFieldState, IFieldInfo } from "@18x18az/rosetta"
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
