import { Websocket } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { getNewMatches, getNewScores, getStaleMatches } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff, getStaleFieldState } from "./fields";
import { config } from "dotenv"
import { IPath, MESSAGE_TYPE } from "@18x18az/rosetta";
import { getAwards } from "./awards";

config()

const hostname = process.env.TM_HOSTNAME as string;
const division = process.env.DIVISION as string;
const fieldset = process.env.FIELDSET as string;
const password = process.env.TM_PASSWORD as string;

const talos_url = process.env.TALOS_URL as string;

export const talos = new Websocket(talos_url);

async function pollUpdater() {
    const newScore = await getNewScores(hostname, division);
    if (newScore) {
        console.log(JSON.stringify(newScore));
        talos.post(['score'], newScore);
    }

    const matchList = await getNewMatches(hostname, division);
    if (matchList) {
        console.log("matches updated");
        talos.post(['matches'], matchList);
    }

    return
}

async function main() {
    const teams = await getTeams(hostname, division);
    //const brr = await getAwards(hostname, division); // test
    //console.log(brr);
    
    talos.connectCb = function () {
        console.log("Sending teams");
        const matches = getStaleMatches();
        const fieldState = getStaleFieldState();
        return [
            {
                type: MESSAGE_TYPE.POST,
                path: ['teams'],
                payload: teams
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['matches'],
                payload: matches
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['field'],
                payload: fieldState
            }
        ]
    }

    talos.getCb = function (path: IPath) {
        const route = path[0];

        if (route === "rankings") {
            console.log("Rankings requested to start alliance selection");
            getRankings(hostname, division).then((rankings) => {
                talos.post(["allianceSelection"], rankings);
            });
        }

        return null;
    }

    talos.post(["teams"], teams);

    doSocketStuff(hostname, fieldset, password);

    setInterval(pollUpdater, 500);
}

main();
