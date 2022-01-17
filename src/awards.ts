import { getAuthTable, getTable } from "./request";
import { getTeamIdFromNumber } from "./teams";

export async function getAwards(hostname: string, division: string): Promise<Array<string>> {
    //const raw = await getTable(`http:${hostname}/${division}/awards`);
    const raw = await getAuthTable('/awards', division, `http:${hostname}/${division}/awards`);
    console.log("boop")
    const winningTeams = raw.map((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const teamId = getTeamIdFromNumber(columns[1]);
        return teamId;
    });

    return winningTeams;
}
