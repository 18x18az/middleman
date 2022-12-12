import { tm } from "./request";
import { JSDOM } from "jsdom";
import { Team, TeamId } from "@18x18az/rosetta";
import { getTeamIdFromNumber } from "./teams";

// TODO: move to rosetta onces TALOS-19 is done + merged
interface IInspectionStatus {
    uninspected: Array<TeamId>
    inspected: Array<TeamId>
}

export async function getInspectionStatus() {
    const raw = await tm.getData("inspection");
    const dom = new JSDOM(raw, {runScripts: "dangerously", resources: "usable"});
    const teams = JSON.parse(dom.window.eval("teams"));
    let uninspected: Array<TeamId> = [];
    let inspected: Array<TeamId> = [];
    teams.forEach((team: any) => {
        if(team["status"] == "NOT_STARTED" || team["status"] == "PARTIAL") {
            uninspected.push(getTeamIdFromNumber(team["number"]) as TeamId);
        }
        else {
            inspected.push(getTeamIdFromNumber(team["number"]) as TeamId);
        }
    });
    let output: IInspectionStatus = {
        uninspected, 
        inspected
    }
    console.log(output)
    return output;
}