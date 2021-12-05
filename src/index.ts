import { getTeams } from "./teams"
import { getMatches as checkForScores } from "./matches";
import { getRankings } from "./rankings";
import { doSocketStuff } from "./fields";

const hostname = "localhost";
const division = "division1";
const fieldset = "1";
const password = "test";

async function scoreUpdater() {
    const newScore = await checkForScores(hostname, division);
    if(newScore){
        console.log(newScore);
    }

    return
}

async function doTheThing() {
    const teams = await getTeams(hostname, division);

    //console.log(await getRankings(hostname, division));
    doSocketStuff(hostname, fieldset, password);

    //setInterval(scoreUpdater, 500);
}

doTheThing();
