//import { getTable } from "./request";
import { Teams, Team, TeamId } from "@18x18az/rosetta"
import { tm } from "./request";

export async function getSkillsRankings() {

    const raw = await tm.getTable(`skills/rankings`);
    raw.forEach((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        console.log("rank: " + columns[0] + "\tteam#: " + columns[1] + "\ttotal: " + columns[3]);
    });

    // TODO: return something useful
}