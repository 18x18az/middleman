import { sha1 } from "object-hash";
import { tm } from "./request";
import { JSDOM } from "jsdom";
import { IInspectionStatus, TeamId } from "@18x18az/rosetta";
import { getTeamIdFromNumber } from "./teams";

let prevHash: string = "";

export async function getInspectionStatus(): Promise<IInspectionStatus | null> {
    const raw = await tm.getData("inspection")
        .catch(err => {
            if (err.includes("ECONNREFUSED")) {
                return []
            } else {
                throw err;
            }
        });
    
    // to avoid getting spammed by ReferenceError: $ is not defined, we just parse
    // the raw HTML. list of teams' inspection status is the first line of var,
    // so search for that. then take the relevant substring of that line and 
    // convert to JSON for parsing
    const rows: string[] = (raw as string).split('\n')
    let line: string = "";
    let skip: boolean = false;
    rows.forEach((row: string) => {
        if (skip) {
            return;
        }
        if (row.substring(0,3) === "var"){
            line = row;
            skip = true;
        }
    })
    line = line.substring(13, line.length-2);
    const teams = JSON.parse(line);

    let notStarted: Array<TeamId> = [];
    let partial: Array<TeamId> = [];
    let inspected: Array<TeamId> = []
    teams.forEach((team: any) => {
        const status = team["status"];
        const id = getTeamIdFromNumber(team["number"]) as TeamId;

        switch(status){
            case "NOT_STARTED": {
                notStarted.push(id);
                break;
            }
            case "PARTIAL": {
                partial.push(id);
            }
            default: {
                inspected.push(id);
            }
        }
    });
    let output: IInspectionStatus = {
        notStarted,
        partial,
        inspected,
        noShow: [],
        notCheckedIn: []
    }

    const hash = sha1(output);
    if (hash !== prevHash) {
        prevHash = hash;
        return output;
    }
    return null;
}