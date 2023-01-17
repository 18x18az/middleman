import { IInspectionStatus } from "@18x18az/rosetta";
import { sha1 } from "object-hash";
import { getReconciledCheckIn } from "./checkin";
import { getRawInspectionStatus } from "./inspectionRaw";

let prevHash: string = "";

export async function getInspectionStatus(): Promise<IInspectionStatus | null> {
    const rawInspection  = await getRawInspectionStatus();
    const output = await getReconciledCheckIn(rawInspection);

    const hash = sha1(output);
    if (hash !== prevHash) {
        prevHash = hash;
        return output;
    }
    return null;
}