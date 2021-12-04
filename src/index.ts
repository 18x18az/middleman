import {getTeams, getTeamIdFromNumber} from "./teams"

const hostname = "localhost"
const division = "division1"

async function doTheThing() {
    const teams = await getTeams(hostname, division);

    console.log(getTeamIdFromNumber(teams['4'].number));
}

doTheThing();