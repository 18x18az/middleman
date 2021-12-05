import * as http from "http"
import * as jsdom from "jsdom";

import { getTeamIdFromNumber } from "./teams";

export function getRankings(hostname: string, division: string): Promise<any> {
    return new Promise((resolve, reject) => {
        http.get(`http:${hostname}/${division}/rankings`, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                const dom = new jsdom.JSDOM(data);
                const contents = Array.from(dom.window.document.querySelector('tbody').rows);
                const rankings = contents.map((row: any) => {
                    const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
                    const teamId = getTeamIdFromNumber(columns[1]);
                    return teamId;
                });

                resolve(rankings);
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}