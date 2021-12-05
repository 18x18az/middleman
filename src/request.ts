import * as http from "http"
import * as jsdom from "jsdom";

export function getTable(url: string): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
        http.get(url, (resp) => {
            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                const dom = new jsdom.JSDOM(data);
                const contents = Array.from(dom.window.document.querySelector('tbody').rows);
                resolve(contents)
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}