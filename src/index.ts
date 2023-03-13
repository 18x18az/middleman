import { getQualificationSchedule } from "./dao/qualSchedule";
import { getTeamList } from "./dao/teams";
import { setup } from "./state/access";

async function main(){
    await setup();
    const teams = await getTeamList();
    const blocks = await getQualificationSchedule();
}

main();

setInterval(function() {
}, 1000 * 60 * 60);
