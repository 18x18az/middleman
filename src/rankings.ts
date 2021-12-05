import { getTable } from "./request";
import { getTeamIdFromNumber } from "./teams";

export async function getRankings(hostname: string, division: string): Promise<Array<string>> {
    const raw = await getTable(`http:${hostname}/${division}/rankings`);

    const rankings = raw.map((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const teamId = getTeamIdFromNumber(columns[1]);
        return teamId;
    });

    return rankings;
}
