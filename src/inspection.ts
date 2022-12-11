import { tm } from "./request";
import { JSDOM } from "jsdom";

export async function getInspectionStatus() {
    const raw = await tm.getData("inspection")
    const dom = new JSDOM(raw, {runScripts: "dangerously", resources: "usable"});
    let teams = JSON.parse(dom.window.eval("teams"))
    console.log(teams)
}