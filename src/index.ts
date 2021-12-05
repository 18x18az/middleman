import { getTeams } from "./teams"
import { getMatches as checkForScores } from "./matches";

const hostname = "localhost"
const division = "division1"

async function scoreUpdater() {
    const newScore = await checkForScores(hostname, division);
    if(newScore){
        console.log(newScore);
    }

    return
}

async function doTheThing() {
    const teams = await getTeams(hostname, division);

    setInterval(scoreUpdater, 500);
}

doTheThing();