//import { getTable } from "./request";
import { Teams, Team, TeamId } from "@18x18az/rosetta"
import { tm } from "./request";

const teamIdMap: {
    [key: string]: TeamId
} = {};

export function getTeamIdFromNumber(number: string): TeamId {
    return teamIdMap[number];
}

export async function getTeams(division: string): Promise<Teams> {
    let id = 0;
    let teams: Teams = {};
    const raw = await tm.getTable(`${division}/teams`);
    raw.forEach((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const teamId = (id++).toString();
        const team: Team = { id: teamId, number: columns[0], name: columns[1], location: columns[2], school: columns[3] };
        teams[teamId] = team;
    });

    for (const [id, team] of Object.entries(teams)) {
        teamIdMap[team.number] = id;
    }

    return (teams);
}