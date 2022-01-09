import { sha1 } from "object-hash";

import { getTable } from "./request";
import { getTeamIdFromNumber } from "./teams";
import { SimpleMatchResult, SimpleAllianceResults, IMatchList, IAllianceTeams, IMatchInfo, MatchType } from "@18x18az/rosetta"

interface HashedResult extends SimpleMatchResult {
    hash?: string
}

const results: MatchResults = {};

let lastLength = 0;
const matchList: IMatchList = {};

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

export async function getNewScores(hostname: string, division: string): Promise<SimpleMatchResult | null> {
    const raw = await getTable(`http:${hostname}/${division}/matches`)
        .catch(err => {
            if (err.includes("ECONNREFUSED")) {
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

export function getStaleMatches(): IMatchList {
    return matchList;
}

export async function getNewMatches(hostname: string, division: string): Promise<IMatchList | null> {
    const raw = await getTable(`http:${hostname}/${division}/matches`)
        .catch(err => {
            if (err.includes("ECONNREFUSED")) {
                return []
            } else {
                throw err;
            }
        });

    if (raw.length !== lastLength) {
        lastLength = raw.length;
        raw.forEach((row: any) => {
            const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
            const matchName = columns[0];
            const red: IAllianceTeams = {
                team1:  getTeamIdFromNumber(columns[1]),
                team2:  getTeamIdFromNumber(columns[2])
            };
            const blue: IAllianceTeams = {
                team1:  getTeamIdFromNumber(columns[3]),
                team2:  getTeamIdFromNumber(columns[4])
            };

            let matchNumber, matchType;
            if (/\s/g.test(matchName)) {
                const contents = matchName.split(" ");
                matchType = contents[0];
                matchNumber = contents[1];
            } else {
                matchNumber = matchName.match(/[\d\-]+/g);
                matchType = String(matchName.match(/[a-zA-Z]+/g));
            }

            let subNumber = null;

            if (/-/g.test(matchNumber)) {
                const contents = matchNumber.split("-");
                matchNumber = contents[0];
                subNumber = contents[1];
            }

            let type = MatchType.QUAL;

            if (matchType === "Q") {
                type = MatchType.QUAL;
            } else if (matchType === 'R16') {
                type = MatchType.R16;
            } else if (matchType === "QF") {
                type = MatchType.QF;
            } else if (matchType === "SF") {
                type = MatchType.SF;
            } else if (matchType === "F") {
                type = MatchType.F;
            }

            const match: IMatchInfo = {
                matchId: matchName,
                type,
                number: matchNumber,
                red,
                blue
            }

            if (subNumber) {
                match.subNumber = subNumber;
            }

            matchList[matchName] = match;
        });

        return matchList;
    } else {
        return null;
    }
}
