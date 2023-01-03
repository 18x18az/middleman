import { sha1 } from "object-hash";
import { ITeams, ITeam, TeamId } from "@18x18az/rosetta"
import { tm } from "./request";
import { getTeamIdFromNumber } from "./teams";

export interface ISkillsRankingData {
    rank: number,
    team: TeamId,
    total: number,
    highProgramming: number,
    numProgramming: number,
    highDriver: number,
    numDriver: number
}
export type ISkillsRankings = Array<ISkillsRankingData>;

let prevHash: string = "";

export async function getSkillsRankings(): Promise<ISkillsRankings | null> {

    const raw = await tm.getTable(`skills/rankings`);
    const skills: ISkillsRankings = raw.map((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const rank = columns[0];
        const team = getTeamIdFromNumber(columns[1]);
        const total = columns[3];
        const highProgramming = columns[4];
        const numProgramming = columns[5];
        const highDriver = columns[6];
        const numDriver = columns[7];
        return {
            rank, team, total,
            highProgramming, numProgramming,
            highDriver, numDriver
        };
    });

    const hash = sha1(skills);
    if (hash !== prevHash) {
        prevHash = hash;
        return skills;
    }
    return null;

    // TODO: return something useful
}