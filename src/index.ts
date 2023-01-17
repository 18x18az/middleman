import { Websocket, IMessageCb } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { alertChange, getNewMatches, getNewScores, getStaleMatches } from "./matches";
import { doSocketStuff, getFieldInfo, getStaleFieldState, getStaleFieldInfo, resetWs, postFieldCommandHandler } from "./fields";
import { getRankings, getRankingsData } from "./rankings";
import { config } from "dotenv"
import { IPath, MESSAGE_TYPE } from "@18x18az/rosetta";
import { getAwards } from "./awards";
import { getSkillsRankings } from "./skills";
import { parseScheduleBlocks } from "./schedule";
import { getInspectionStatus } from "./inspectionOverall";

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

        const rankings = await getRankingsData(division);
        if (rankings) {
            console.log("rankings updated");
            talos.post(['rankings'], rankings);
        }

        const skills = await getSkillsRankings();
        if (skills) {
            console.log("skills updated");
            talos.post(['skills'], skills);
        }
    } catch (e) {
        alertChange();
        resetWs();
    }

    return
}

async function main() {
    const teams = await getTeams(division);
    const inspection = await getInspectionStatus();
    const fieldInfo = await getFieldInfo(fieldset);
    const schedule = await parseScheduleBlocks();
    const rankings = await getRankingsData(division);
    const skills = await getSkillsRankings();
    console.log(schedule);
    
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
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['rankings'],
                payload: rankings
            },
            {
                type: MESSAGE_TYPE.POST,
                path: ['skills'],
                payload: skills
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
            getRankingsData(division).then((rankings) => {
                talos.post(["rankings"], rankings);
            })
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

    talos.postCb = function (path: IPath, payload: any) {
        const route = path[0];

        if (route === "fieldCommand") {
            postFieldCommandHandler(fieldset, path, payload);
        }

        return null
    }

    doSocketStuff(fieldset);

    setInterval(pollUpdater, 500);
}

main();