import WebSocket from "ws";
import axios from "axios";
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

async function getSession(hostname: string, password: string) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    const resp = await client.post(
        `http://${hostname}/admin/login?user=admin&password=${password}`
    );

    const cookies = jar.toJSON().cookies[0]['value'];
    return cookies;
}

export async function doSocketStuff(hostname: string, fieldset: string, password: string) {
    const user = await getSession(hostname, password);
    const cookieString = `user=${user}; lastFieldSetId=1"`
    console.log(cookieString);
    const ws = new WebSocket(`ws://${hostname}/fieldsets/${fieldset}`, {
        headers: {
            Cookie: cookieString
        }
    });

    ws.on('open', function open() {
        console.log('connected');
    });

    ws.on('message', function message(data) {
        console.log('received: %s', data);
    });

    ws.on('close', function close() {
        console.log('disconnected');
    });

    console.log('here');

}
