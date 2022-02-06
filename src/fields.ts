import { FieldControl, IFieldState } from "@18x18az/rosetta"
import { talos } from "./index"
import { tm } from "./request";

let currentFieldState: IFieldState = {
    field: "0",
    control: FieldControl.DISABLED,
    timeRemaining: 0,
    match: "None"
}

export function getStaleFieldState(): IFieldState {
    return currentFieldState;
}

export async function doSocketStuff(fieldset: string) {
    const ws = await tm.getFieldControlSocket(fieldset);

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
                currentFieldState.control = FieldControl.AUTONOMOUS
            } else if (period === "Driver Control") {
                currentFieldState.control = FieldControl.DRIVER
            } else if (info.state === "TIMEOUT") {
                currentFieldState.control = FieldControl.TIMEOUT
            } else if (period === "") {
                currentFieldState.control = FieldControl.DISABLED
            }

            currentFieldState.timeRemaining = info.remaining;
        } else if (type === "matchPaused") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FieldControl.PAUSED;
        } else if (type === "matchStopped") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FieldControl.DISABLED;
        } else if (type === "matchAborted") {
            currentFieldState.timeRemaining = 0;
            currentFieldState.control = FieldControl.DISABLED;
        } else if (type === "timerReset") {
            currentFieldState.field = info.fieldId;
        } else if (type === "fieldMatchAssigned") {
            currentFieldState.match = info.name;
        }
        console.log(currentFieldState);
        talos.post(["field", currentFieldState.field], currentFieldState);
    });

    ws.on('close', function close() {
        console.log('disconnected');
    });
}
