import * as http from "http"
import * as jsdom from "jsdom";
import { sha1 } from "object-hash";

import { getTeamIdFromNumber } from "./teams";
import { SimpleMatchResult, SimpleAllianceResults } from "@18x18az/rosetta"

interface HashedResult extends SimpleMatchResult {
    hash?: string
}

const results: MatchResults = {};

interface MatchResults {
    [key: string]: HashedResult
}

function makeAllianceResults(team1: string, team2: string, score: string): SimpleAllianceResults{
    const team1Id = getTeamIdFromNumber(team1);
    const team2Id = getTeamIdFromNumber(team2);
    const processedScore = parseInt(score.trim());

    return {
        team1: team1Id,
        team2: team2Id,
        score: processedScore
    }
}

export function getMatches(hostname: string, division: string): Promise<SimpleMatchResult | null> {
    return new Promise((resolve, reject) => {
        http.get(`http:${hostname}/${division}/matches`, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                const dom = new jsdom.JSDOM(data);
                const contents = Array.from(dom.window.document.querySelector('tbody').rows);
                let updated = null;
                contents.forEach((row: any) => {
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

                resolve(updated);
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}