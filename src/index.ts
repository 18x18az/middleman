import { Websocket } from "@18x18az/ouija"
import { getTeams } from "./teams"
import { getMatches as checkForScores } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff } from "./fields";
import {config} from "dotenv"

config()

const hostname = process.env.TM_HOSTNAME as string;
const division = process.env.DIVISION as string;
const fieldset = process.env.FIELDSET as string;
const password = process.env.TM_PASSWORD as string;

async function scoreUpdater() {
    const newScore = await checkForScores(hostname, division);
    if(newScore){
        console.log(newScore);
    }

    return
}

async function doTheThing() {
    const teams = await getTeams(hostname, division);

    console.log(await getRankings(hostname, division));
    doSocketStuff(hostname, fieldset, password);

    setInterval(scoreUpdater, 500);
}

doTheThing();
