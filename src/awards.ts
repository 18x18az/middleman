import { IAllianceTeams, IAward, IAwards, TeamId } from "@18x18az/rosetta";
import { tm } from "./request";
import { getTeamIdFromNumber } from "./teams";

export async function getAwards(division: string): Promise<IAwards> {
    const awardMap = new Map<string, TeamId | IAllianceTeams | null>();

    const raw = await tm.getTable(`${division}/awards`);
    raw.map((row: any) => {
        const id = row.id;
        const awardName = row.querySelector(`#${id}_name`).textContent;
        const awardWinnerSelector = row.querySelector(`#${id}_winnerEntryNumber`);
        const selectedIndex = awardWinnerSelector.selectedIndex;
        let winner = null;
        if (selectedIndex) {
            const winnerNumber = awardWinnerSelector.options[selectedIndex].textContent;
            winner = getTeamIdFromNumber(winnerNumber);
        }

        const existing = awardMap.get(awardName);
        if (existing) {
            if (existing && winner) {
                const winningAlliance: IAllianceTeams = {
                    team1: existing as TeamId,
                    team2: winner
                }
                awardMap.set(awardName, winningAlliance);
            }
        } else {
            awardMap.set(awardName, winner);
        }
    });

    const winningTeams: IAwards = [];
    awardMap.forEach((winner, name) => {
        const award: IAward = {name, winner};
        winningTeams.push(award)
    });

    return winningTeams;
}
