declare global {
    interface String {
        padStart(n?:number, char?:string):string;
    }
    interface Date {
        format(fmt?:string):string;
    }
}

import {logger as console, printable, errorPrintable, getLogger} from './logger';
import * as process from 'process';
import {Request,Response} from 'express';
import * as express from 'express'; //this load used 100ms
import {basename} from 'path';
let session:any = require('express-session');
let parser:any = require('body-parser');
import * as _ from 'underscore';
let bluebird = require('bluebird');
export let fs = require('fs');

let existsAsync = path => {
    return new Promise(resolve=>{
        fs.exists(path, r=>{
            resolve(r);
        });
    });
};

export function createApp(dir):any {
    let app = express();
    app.use(require('morgan')('dev'))
        .use(require('cookie-parser')())
        .use(require('connect-timeout')('20s'))
        .use(parser.json({limit: '50mb'}))
        .use(parser.urlencoded({extended:true,limit: '50mb'}))
        .use(parser.text({type:'text/*',limit: '50mb'}))
        .use(parser.raw({limit: '50mb'}))
        .get('/api/ping', (req, res) => {
            res.header("Content-Type", "application/json; charset=utf-8").send('true');
        })
        .all('/api/:service/*', (req, res)=>handleService(dir, req, res))
    ;
    console.log('app inited');
    return app;
}

export function globalInit() {
    require("date-format-lite");
    Date['masks']['default'] = 'YYYY-MM-DD hh:mm:ss';
    require('babel-polyfill');
    if (!fs.statAsync)
        bluebird.promisifyAll(fs);
    process.on('unhandledRejection', (reason, p) => {
        console.log('---------------------------unhandledRejection:', reason);
    });
    console.log('global inited');
}

export async  function outputResult (console, res:Response, cont:any, status?:number) {
    status = status || 200;
    if (cont.stack) cont = await errorPrintable(cont);
    if (status == 200) {
        res.header("Content-Type", "application/json; charset=utf-8");
        cont = JSON.stringify(cont) + '\n';
    }

    let req:Request = res['req'];
    let einfo1 = `${req.method} ${req.url} ${JSON.stringify(req.query)} body: ` + printable(req.body);
    let einfo2 = ` status: ${status} result: ${printable(cont)}`;
    if(status!=200) {
        let hint = ` hint:[${Math.random().toString(36).substr(2,8)}]\n`;
        cont = typeof cont=='string'?hint+cont: (typeof cont == 'object' ? _.extend(cont, {hint}) : cont);
        einfo1 += hint;
        await fs.writeFile('/tmp/e.log', `${new Date().format()} ${einfo1} \n${new Date().format()} ${einfo2}\n\n`, {encoding: 'utf8',flag: 'a'});
    }
    console.log(einfo1);
    console.log(einfo2);
    res.status(status).send(cont);
}

async function existModule(path) {
    if (await existsAsync(path+'.js')) return true;
    if (await existsAsync(path+'.ts')) return true;
    return false;
}

async function callFunc(console:Console, dir, req, res) {
    let ps = req.path.slice('/api/'.length).split('/');
    let service = ps[0];
    let file = ps.slice(0, ps.length-1).join('/');
    let func = ps[ps.length-1];
    let index = `${dir}/${service}/index`;
    let js = `${dir}/${file}`;
    if (await existModule(index)) {
        let m4 = require(index);
        if (!m4.entry) {
            return Promise.reject([`can't find func entry in ${index}`, 404]);
        }
        return await m4.entry(console, req, res);
    } else if (await existModule(js)) {
        let md = require(js);
        if (!md[func]) {
            return Promise.reject([`can't find func: ${func} in file: ${js}`, 404]);
        }
        return await md[func](console, req.query, req.body, req, res);
    }
    return Promise.reject([`can't find file ${js} or ${index}`, 404]);
}

export async function handleService(dir, req:Request, res:Response): Promise<any> {
    let request_id = req.header('x-request-id');
    let console = getLogger(request_id);
    console.log(`${req.method} ${req.url} ${JSON.stringify(req.query)} body: ` + printable(req.body));
    let promise = callFunc(console, dir, req, res);
    promise.then(
        r => r && outputResult(console, res, r, 200),
        err=> outputResult(console, res, err, 500)
    );
}
