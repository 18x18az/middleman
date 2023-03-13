import { tmDatabase } from "../repository/tmDatabase"
import { adminServer } from "../repository/tmWebserver";

interface IAlliance {
    team1: number
    team2: number
}

interface ScheduledQualificationMatch {
    number: number
    redAlliance: number
    blueAlliance: number
}

interface RawScheduleBlock {
    start: Date
    end: Date
    numMatches: number
}

async function getRawScheduleBlocks() {
    const rawBlocks = await tmDatabase.getAll('schedule_blocks');

    return rawBlocks.map((rawBlock) => {
        const startSeconds = rawBlock['start'];
        const endSeconds = rawBlock['stop'];
        const duration = endSeconds - startSeconds;
        const cycleTime = rawBlock['cycle_time'];

        const start = new Date(startSeconds * 1000);
        const end = new Date(endSeconds * 1000);
        const numMatches = Math.ceil(duration / cycleTime);

        return { start, end, numMatches }
    })
}

async function getRawQualMatches() {
    const rawMatchList = await adminServer.getTable(`division1/matches`);

    return rawMatchList.map(row => {
        const columns = Array.from(row.cells).map((cell: any) => (cell.textContent));

        const matchName = columns[0] as string;
        if (!matchName.startsWith("Q")) {
            return;
        }

        const matchNumber = matchName.split('Q')[1];

        const redAlliance: IAlliance = {
            team1: columns[1],
            team2: columns[2]
        }

        const blueAlliance: IAlliance = {
            team1: columns[3],
            team2: columns[4]
        }

        return ({
            matchNumber, redAlliance, blueAlliance
        })
    });
}

export async function getQualificationSchedule() {
    let rawMatches = await getRawQualMatches();
    const rawBlocks = await getRawScheduleBlocks();

    return rawBlocks.map(block => {
        const thisBlock = rawMatches.splice(0, block.numMatches);
        return {
            start: block.start,
            end: block.end,
            matches: thisBlock
        }
    });
}