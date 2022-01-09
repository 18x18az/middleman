import { Websocket } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { getMatches } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff } from "./fields";
import {config} from "dotenv"
import { MESSAGE_TYPE } from "@18x18az/rosetta";

config()

const hostname = process.env.TM_HOSTNAME as string;
const division = process.env.DIVISION as string;
const fieldset = process.env.FIELDSET as string;
const password = process.env.TM_PASSWORD as string;

const talos_url = process.env.TALOS_URL as string;

export const talos = new Websocket(talos_url);

async function scoreUpdater() {
    const newScore = await getMatches(hostname, division);
    if(newScore){
        console.log(JSON.stringify(newScore));
        talos.post(['score'], newScore);
    }

    return
}

async function main() {
    const teams = await getTeams(hostname, division);

    talos.connectCb = function () {
        console.log("Sending teams");
        return {
            type: MESSAGE_TYPE.POST,
            path: ['teams'],
            payload: teams
        }
    }

    talos.post(["teams"], teams);

    console.log(await getRankings(hostname, division));
    doSocketStuff(hostname, fieldset, password);

    setInterval(scoreUpdater, 500);
}

main();
