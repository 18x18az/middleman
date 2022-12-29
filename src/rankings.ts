import { sha1 } from "object-hash";
import { TeamId } from "@18x18az/rosetta";
import { tm } from "./request";
import { getTeamIdFromNumber } from "./teams";

export async function getRankings(division: string): Promise<Array<string>> {
    const raw = await tm.getTable(`${division}/rankings`);

    const rankings = raw.map((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const teamId = getTeamIdFromNumber(columns[1]);
        return teamId;
    });

    return rankings;
}

let prevHash: string = "";

export interface IRankingData {
    rank: number,
    team: TeamId,
    avgWP: number,
    avgAP: number,
    avgSP: number,
    record: string
};

export type IRankings = Array<IRankingData>;

export async function getRankingsData(division: string): Promise<IRankings | null> {
    const raw = await tm.getTable(`${division}/rankings`);

    const rankings: IRankings = raw.map((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const rank = columns[0];
        const team = getTeamIdFromNumber(columns[1]);
        const avgWP = columns[3];
        const avgAP = columns[4];
        const avgSP = columns[5];
        const record = columns[6];
        return {
            rank, team,
            avgWP, avgAP, avgSP,
            record
        };
    });

    const hash = sha1(rankings);
    if (hash !== prevHash) {
        prevHash = hash;
        return rankings;
    }

    return null;
}