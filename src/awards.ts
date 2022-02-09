import { tm } from "./request";
import { getTeamIdFromNumber } from "./teams";

export async function getAwards(division: string) {
    const raw = await tm.getTable(`${division}/awards`);
    const winningTeams = raw.map((row: any) => {
        const id = row.id;
        const awardName = row.querySelector(`#${id}_name`).textContent;
        console.log(awardName);
        const awardWinnerSelector = row.querySelector(`#${id}_winnerEntryNumber`);
        const selectedIndex = awardWinnerSelector.selectedIndex;
        let winner = null;
        if(selectedIndex){
            const winnerNumber = awardWinnerSelector.options[selectedIndex].textContent;
            winner = getTeamIdFromNumber(winnerNumber);
        }

        return {
            award: awardName,
            winner
        }
    });

    return winningTeams;
}
