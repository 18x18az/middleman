import { config } from "dotenv";
const sqlite3 = require('sqlite3').verbose();
config();

interface ScheduleBlock {
    start: Date,
    stop: Date,
}

const db = new sqlite3.Database(process.env.DB_PATH as string, sqlite3.OPEN_READWRITE);

export async function parseScheduleBlocks(): Promise<ScheduleBlock[]> {
    return new Promise<ScheduleBlock[]>(resolve => {
        let blocks: ScheduleBlock[] = [];
        db.all('SELECT * FROM schedule_blocks', (err: any, rows: any) => {
            if (err) {
                console.error(err.message);
                return;
            }
            console.log(rows);
            rows.forEach((element: any) => {
                let start: Date = new Date(element.start * 1000);
                let stop: Date = new Date(element.stop * 1000);
                let block: ScheduleBlock = {
                    start, stop
                }
                blocks.push(block);           
                resolve(blocks);
            });
        });
    });
}
