import { Websocket } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { alertChange, getNewMatches, getNewScores, getStaleMatches } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff, getFieldInfo, getStaleFieldState, getStaleFieldInfo, resetWs } from "./fields";
import { config } from "dotenv"
import { IPath, MESSAGE_TYPE } from "@18x18az/rosetta";
import { getAwards } from "./awards";
import { getSkillsRankings } from "./skills";
import { getInspectionStatus } from "./inspection";
import { parseScheduleBlocks } from "./schedule";

config()

const division = process.env.DIVISION as string;
const talos_url = process.env.TALOS_URL as string;
const fieldset = process.env.FIELDSET as string;

export const talos = new Websocket(talos_url);

async function pollUpdater() {
    try {
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

        const inspection = await getInspectionStatus();
        if (inspection) {
            console.log("inspection updated");
            talos.post(['inspection'], inspection);
        }
    } catch (e) {
        alertChange();
        resetWs();
    }

    return
}

// send updates to scores.18x18az.org periodically
async function viaUpdater() {
    getSkillsRankings();
    // if nothing has changed, don't send scores.18x18 an update!
    // need to check:
    // - schedule changes
    // - match results -> implies rankings needs to be updated
    // - existence of elim matches
    // - skills rankings

    // we also need to get general event information.
    // is it possible to get event information from the TM webserver?
    // - such as event name, location, etc.
    // - perhaps scores.18x18az will need to poll robotevents maybe once a week?
}

async function main() {
    const teams = await getTeams(division);
    const inspection = await getInspectionStatus();
    const schedule = await parseScheduleBlocks();
    console.log(schedule);
    
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
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['inspection'],
                payload: inspection
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['schedule'],
                payload: schedule
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
        } else if (route === "awards") {
            console.log("updated awards requested");
            getAwards(division).then(awards => {
                talos.post(["awards"], awards);
            });
        } else if (route === "schedule") {
            console.log("schedule requested");
            parseScheduleBlocks().then(schedule => {
                talos.post(["schedule"], schedule);
            });
        }

        return null;
    }

    doSocketStuff(fieldset);

    setInterval(pollUpdater, 500);
    setInterval(viaUpdater, 3000); // TODO: make this longer, like 90-120 seconds (90000-120000)
}

main();