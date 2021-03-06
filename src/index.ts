import { Websocket } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { getNewMatches, getNewScores, getStaleMatches } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff, getFieldInfo, getStaleFieldState, getStaleFieldInfo } from "./fields";
import { config } from "dotenv"
import { IPath, MESSAGE_TYPE } from "@18x18az/rosetta";
import { getAwards } from "./awards";

config()

const division = process.env.DIVISION as string;
const talos_url = process.env.TALOS_URL as string;
const fieldset = process.env.FIELDSET as string;

export const talos = new Websocket(talos_url);

async function pollUpdater() {
    const newScore = await getNewScores(division);
    if (newScore) {
        console.log(JSON.stringify(newScore));
        talos.post(['score'], newScore);
    }

    const matchList = await getNewMatches(division);
    if (matchList) {
        console.log("matches updated");
        talos.post(['matches'], matchList);
    }

    return
}

async function main() {
    const teams = await getTeams(division);
    const fieldInfo = await getFieldInfo(fieldset);
    //const brr = await getAwards(hostname, division); // test
    //console.log(brr);
    
    talos.connectCb = function () {
        console.log("Sending teams");
        const matches = getStaleMatches();
        const fieldState = getStaleFieldState();
        const fieldInfo = getStaleFieldInfo();
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
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['fields'],
                payload: fieldInfo
            }
        ]
    }

    talos.getCb = function (path: IPath) {
        const route = path[0];

        if (route === "rankings") {
            console.log("Rankings requested to start alliance selection");
            getRankings(division).then((rankings) => {
                talos.post(["allianceSelection"], rankings);
            });
        } else if(route === "awards") {
            console.log("updated awards requested");
            getAwards(division).then(awards => {
                talos.post(["awards"], awards);
            });
        }

        return null;
    }

    talos.post(["teams"], teams);

    doSocketStuff(fieldset);

    setInterval(pollUpdater, 500);
}

main();