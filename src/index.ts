import { getTeamList } from "./dao/teams";
import { setup } from "./state/access";

async function main(){
    await setup();

    while(true){
        const teams = await getTeamList();
        //console.log(teams);
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();

setInterval(function() {
}, 1000 * 60 * 60);
