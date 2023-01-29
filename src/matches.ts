import { sha1 } from "object-hash";

import { tm } from "./request";
import { getTeamIdFromNumber } from "./teams";
import { ISimpleMatchResult, ISimpleAllianceResults, IMatchList, IAlliance, IMatchInfo, MATCH_TYPE } from "@18x18az/rosetta"

interface HashedResult extends ISimpleMatchResult {
    hash?: string
}

const results: MatchResults = {};

let lastLength = 0;
const matchList: IMatchList = {};
let expectChange = false;

export function alertChange() {
    expectChange = true;
}

interface MatchResults {
    [key: string]: HashedResult
}

function makeAllianceResults(team1: string, team2: string | null, score: string): ISimpleAllianceResults {
    let alliance: IAlliance = {
        team1: getTeamIdFromNumber(team1)
    }
    if (team2) {
        alliance.team2 = getTeamIdFromNumber(team2);
    }
    const processedScore = parseInt(score.trim());

    return {
        alliance: alliance,
        score: processedScore
    }
}

function makeMatchResultFromColumns(columns: any[]): HashedResult {
    const length = columns.length;

    if (length === 5) { // VEX U
        const redResults = makeAllianceResults(columns[1], null, columns[3]);
        const blueResults = makeAllianceResults(columns[2], null, columns[4]);
        return ({
            name: columns[0],
            red: redResults,
            blue: blueResults
        });
    } else { // VRC
        const redResults = makeAllianceResults(columns[1], columns[2], columns[5]);
        const blueResults = makeAllianceResults(columns[3], columns[4], columns[6]);
        return ({
            name: columns[0],
            red: redResults,
            blue: blueResults
        });
    }
}

export async function getNewScores(division: string): Promise<ISimpleMatchResult | null> {
    const raw = await tm.getTable(`${division}/matches`)
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
        const matchResult = makeMatchResultFromColumns(columns);
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

function getMatchesFromColumns(columns: any[]):{red: IAlliance, blue: IAlliance} {
    if(columns.length === 5){ // VEX U
        const red: IAlliance = {
            team1: getTeamIdFromNumber(columns[1])
        };
        const blue: IAlliance = {
            team1: getTeamIdFromNumber(columns[2])
        };
        return({
            red,
            blue
        })
    } else { // VRC
        const red: IAlliance = {
            team1: getTeamIdFromNumber(columns[1]),
            team2: getTeamIdFromNumber(columns[2])
        };
        const blue: IAlliance = {
            team1: getTeamIdFromNumber(columns[3]),
            team2: getTeamIdFromNumber(columns[4])
        };
        return({
            red,
            blue
        })
    }
}

export async function getNewMatches(division: string): Promise<IMatchList | null> {
    const raw = await tm.getTable(`${division}/matches`)
        .catch(err => {
            if (err.includes("ECONNREFUSED")) {
                return []
            } else {
                throw err;
            }
        });

    if (raw.length !== lastLength || expectChange) {
        expectChange = false;
        lastLength = raw.length;
        raw.forEach((row: any) => {
            const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));

            const matchName = columns[0];
            const alliances = getMatchesFromColumns(columns);

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

            let type = MATCH_TYPE.QUAL;

            if (matchType === "Q") {
                type = MATCH_TYPE.QUAL;
            } else if (matchType === 'R16') {
                type = MATCH_TYPE.R16;
            } else if (matchType === "QF") {
                type = MATCH_TYPE.QF;
            } else if (matchType === "SF") {
                type = MATCH_TYPE.SF;
            } else if (matchType === "F") {
                type = MATCH_TYPE.F;
            }

            const match: IMatchInfo = {
                matchId: matchName,
                type,
                number: matchNumber,
                red: alliances.red,
                blue: alliances.blue
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
