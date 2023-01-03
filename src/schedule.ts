import { config } from "dotenv";
const sqlite3 = require('sqlite3').verbose();
config();

interface ScheduleBlock {
    start: Date,
    stop: Date,
    matches: number[]
}

const db = new sqlite3.Database(process.env.DB_PATH as string, sqlite3.OPEN_READWRITE);

export async function parseScheduleBlocks(): Promise<ScheduleBlock[]> {
    return new Promise<ScheduleBlock[]>(resolve => {
        let blocks: ScheduleBlock[] = [];
        db.serialize(() => {
            db.all('SELECT * FROM schedule_blocks', (err: any, rows: any) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                rows.forEach((element: any) => {
                    let start: Date = new Date(element.start * 1000);
                    let stop: Date = new Date(element.stop * 1000);
                    let matches: number[] = []
                    let block: ScheduleBlock = {
                        start, stop, matches
                    }
                    blocks.push(block);           
                });
            });
            // only get qual matches
            db.each('SELECT match, projected_time FROM matches WHERE round = 2', (err: any, row: any) => {
                for (let i = 0; i < blocks.length; i++) {
                    if (blocks[i].start.getTime() <= row.projected_time * 1000 && row.projected_time * 1000 < blocks[i].stop.getTime()) {
                        //console.log(`assigned Q${row.match} to block ${i}`);
                        blocks[i].matches.push(row.match);
                        break;
                    }
                }
            }, (err: any, count: any) => {
                resolve(blocks);
            });
        })
    });
}
