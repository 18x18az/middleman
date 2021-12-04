import * as http from "http"
import * as jsdom from "jsdom";
import { Teams, Team } from "@18x18az/rosetta"

const hostname = "localhost"
const division = "division1"

function getTeams(): Promise<Teams> {
    return new Promise((resolve, reject) => {
        http.get(`http:${hostname}/${division}/teams`, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                let id = 0;
                let teams: Teams = {};
                const dom = new jsdom.JSDOM(data);
                const contents = Array.from(dom.window.document.querySelector('tbody').rows);
                contents.forEach((row: any) => {
                    const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));
                    const teamId = (id++).toString();
                    const team: Team = { id: teamId, number: columns[0], name: columns[1], location: columns[2], school: columns[3] };
                    teams[teamId] = team;
                });

                resolve(teams);
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}

async function doTheThing() {
    const result = await getTeams();
    console.log(result);
}

doTheThing();