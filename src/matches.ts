import { sha1 } from "object-hash";

import { getTable } from "./request";
import { getTeamIdFromNumber } from "./teams";
import { SimpleMatchResult, SimpleAllianceResults } from "@18x18az/rosetta"

interface HashedResult extends SimpleMatchResult {
    hash?: string
}

const results: MatchResults = {};

interface MatchResults {
    [key: string]: HashedResult
}

function makeAllianceResults(team1: string, team2: string, score: string): SimpleAllianceResults {
    const team1Id = getTeamIdFromNumber(team1);
    const team2Id = getTeamIdFromNumber(team2);
    const processedScore = parseInt(score.trim());

    return {
        team1: team1Id,
        team2: team2Id,
        score: processedScore
    }
}

export async function getMatches(hostname: string, division: string): Promise<SimpleMatchResult | null> {
    const raw = await getTable(`http:${hostname}/${division}/matches`)
        .catch(err => {
            if(err.includes("ECONNREFUSED")){
                return []
            } else {
                throw err;
            }
        });

    let updated = null;
    raw.forEach((row: any) => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
        const redResults = makeAllianceResults(columns[1], columns[2], columns[5]);
        const blueResults = makeAllianceResults(columns[3], columns[4], columns[6]);
        const matchResult: HashedResult = {
            name: columns[0],
            red: redResults,
            blue: blueResults
        }
        const hash = sha1(matchResult);
        matchResult.hash = hash;

        const existing = results[matchResult.name];
        if (existing) {
            if (existing.hash !== matchResult.hash) {
                results[matchResult.name] = matchResult;
                const { hash, ...updatedResults } = matchResult;
                updated = updatedResults;
            }
        } else {
            results[matchResult.name] = matchResult;
        }

    });

    return (updated);
}
