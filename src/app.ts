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
let parser:any = require('body-parser');
import * as _ from 'underscore';
export let fs = require('fs');
import * as util from './util';

let globalInited = false;
function globalInit() {
  if (globalInited) return;
  globalInited = true;
  let begin = new Date().getTime();
  require("date-format-lite");
  Date['masks']['default'] = 'YYYY-MM-DD hh:mm:ss';
  require('babel-polyfill');
  let bluebird = require('bluebird');
  if (!fs.statAsync) {
    bluebird.promisifyAll(fs);
    fs.existsAsync = path => {
      return new Promise(resolve=>{
        fs.exists(path, r=>resolve(r));
      });
    };
  }
  process.on('unhandledRejection', (reason, p) => {
    console.log('---------------------------unhandledRejection:', reason);
  });
  console.log(`global inited. used: ${new Date().getTime()-begin} ms`);
}

export function createApp(conf):any {
  let app = express();
  app.use(require('morgan')('dev'))
    .use(require('cookie-parser')())
    .use(require('connect-timeout')('1s'))
    .use(parser.json({limit: '50mb'}))
    .use(parser.urlencoded({extended:true,limit: '50mb'}))
    .use(parser.text({type:'text/*',limit: '50mb'}))
    .use(parser.raw({limit: '50mb'}))
    ;
  console.log('app inited');
  if (conf.port) {
    app.listen(conf.port, ()=>{
      console.log(`listening to port: ${conf.port}`)
    });
  }
  globalInit();
  if (conf.center) {
    createGlobalCenter(app, conf);
  }
  if (conf.services) {
    createServices(app, conf);
  }
  if (conf.proxy) {
    createGlobalProxy(app, conf);
  }
  return app;
}

export function createServices(app, conf) {
  let {port, names, dir} = conf.services;
  let net = require('./net');
  app.use(names.map(s=>`/api/${s}/`), (req, res)=>handleService(dir, req, res));
  app.listen(port, ()=>{
    console.log(`services listening on port: ${port}`);
  });
  if (!conf.centers)
    return;
  let reg = ()=>conf.centers.split(';').map(h=>{
    net.postJson(console, h, {services:names, port:port});
  });
  util.setInterval2(reg, 30000, 0);
}

export async  function outputResult (console, res:Response, cont:any, status?:number) {
  status = status || 200;
  let req:Request = res['req'];
  let request_id = req['request-id'];
  if (cont.stack) cont = await errorPrintable(cont);
  if (status == 200) {
    res.header("Content-Type", "application/json; charset=utf-8");
    cont = JSON.stringify(cont) + '\n';
  }
  res.header('x-request-id', request_id);
  let einfo1 = `${req.method} ${req.originalUrl} ${JSON.stringify(req.query)} body: ` + printable(req.body);
  let einfo2 = ` status: ${status} result: ${printable(cont)}`;
  if(status!=200) {
    let hint = ` hint:[${request_id}]\n`;
    cont = typeof cont=='string'?hint+cont: (typeof cont == 'object' ? _.extend(cont, {hint}) : cont);
    einfo1 += hint;
    await fs.writeFile('/tmp/e.log', `${new Date().format()} ${einfo1} \n${new Date().format()} ${einfo2}\n\n`, {encoding: 'utf8',flag: 'a'});
  }
  console.log(einfo1);
  console.log(einfo2);
  res.status(status).send(cont);
}

async function existModule(path) {
  if (await fs.existsAsync(path+'.js')) return true;
  if (await fs.existsAsync(path+'.ts')) return true;
  return false;
}

async function callFunc(console:Console, dir, req, res) {
  let ps = req.originalUrl.slice('/api/'.length).split('/');
  let service = ps[0];
  let file = ps.slice(0, ps.length-1).join('/');
  let func = ps[ps.length-1].split('?')[0];
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
    let r = md[func](console, req.query, req.body, req, res);
    if (r && r.then) {
      r = await r;
    }
    return r;
  }
  return Promise.reject([`can't find file ${js} or ${index}`, 404]);
}

export async function handleService(dir, req:Request, res:Response): Promise<any> {
  return handleRequest(req, res, (console, req, res)=>callFunc(console, dir, req, res));
}

export async function handleRequest(req:Request, res:Response, handler): Promise<any> {
  let request_id = req.header('x-request-id') || '-'+randString();
  req['request_id'] = request_id;
  let console = getLogger(request_id);
  let promise = handler(console, req, res);
  promise.then(
    r => r && outputResult(console, res, r, 200),
    err=> outputResult(console, res, err, 500)
  );
}

export function randString(length=8) {
  return Math.random().toString(36).slice(2, length+2);
}

//following is for center and proxy

export function createGlobalCenter(app, conf) {
    app.use('/api/center', (req, res) => handleRequest(req, res, register));
    app.listen(conf.center.port, ()=>{
      console.log(`center listening on port: ${conf.center.port}`);
    });
    centerServices.setSaveFile(conf.center.dataFile);
}

export function createGlobalProxy(app, conf) {
  app.use('*', (req, res) => handleRequest(req, res, proxy));
  app.listen(conf.proxy.port, ()=>{
    console.log(`proxy listening on port: ${conf.proxy.port}`);
  });
  if (!conf.center && conf.centers) { //如果此进程没有center，则需要进行心跳获取最新的service，否则数据直接共享
    async function heartBeat() {
      let host = conf.centers.split(';')[0];
      let net = require('./net');
      centerServices.services = await net.getJson(console, host);
    }

    util.setInterval2(heartBeat, 30000, 1000);
  }
}

class CenterServices {
  async setSaveFile(filename) {
    this.filename = filename;
    if (filename) {
      let r = await util.loadJsonConf(filename);
      this.services = r;
      console.log(`services loaded: ${JSON.stringify(this.services)}`);
    }
  }
  filename:string;
  services:any = {};
  clearExpires = ()=>{
    let now = new Date().getTime();
    for (let service in this.services) {
      let hosts = this.services[service];
      for (let host in hosts) {
        let info = hosts[host];
        if (info.expire < now) {
          console.log(`clearing now: ${now}, info: `, JSON.stringify(info));
          delete hosts[host];
        }
      }
      if (_.isEmpty(hosts)) {
        delete this.services[service];
      }
    }
    if (this.filename)
      fs.writeFileAsync(this.filename, JSON.stringify(this.services));
  };
  addHost = (service) => {
    let name = service.name;
    if (!this.services[name]) {
      this.services[name] = {};
    }
    let hosts = this.services[name];
    let expire = service.expire || new Date().getTime() + 50 * 60 * 1000;
    let key = `http://${service.ip}:${service.port}`;
    hosts[key] = _.extend({}, service, {key, expire, expireTime:new Date(expire).format()});
    if (this.filename)
      fs.writeFileAsync(this.filename, JSON.stringify(this.services));
  }
  deleteHost = (service, host)=>{
    if (this.services[service]) {
      delete this.services[service][host];
    }
  }
}

let centerServices = new CenterServices();

// 注册一个服务，返回所有已注册的服务，如果没有服务名，则不注册服务，只返回所有服务
// 如果指定一个过期的expire，则删除服务
export async function register(console:Console, req:Request) {
  let {service, port, expire, services, ip, priority} = _.extend({}, req.query, req.body);
  ip = ip || req.connection.remoteAddress;
  if (ip[0] == ':')
    ip = `[${ip}]`;
  services = services || [];
  if (service) {
    services.push(service);
  }
  services.map(m=>centerServices.addHost({name:m, ip, port, expire, priority}));
  centerServices.clearExpires();
  return centerServices.services;
}

class CurrentServices {
  constructor(){
    setInterval(()=>{this.services={}}, 30*1000);
  }
  services:any = {};
  allocateService(service, failedAddr?) { // allocate an address diff from failedAddr;
    if (failedAddr) {
      if (this.services[service] == failedAddr) {
        delete this.services[service];
      }
      centerServices.deleteHost(service, failedAddr);
    }
    if (this.services[service]) //上次的地址OK，返回
      return this.services[service];
    let candidates = _.values(centerServices.services[service]||{});
    if (!candidates.length)
      return null;
    candidates = candidates.sort((a,b)=>(b.priority||-1000)-(a.priority||-1000)); //优先级排序
    if (candidates[0].priority)
      candidates = candidates.filter(a=>a.priority=candidates[0].priority); //只取优先级最高的候选
    return candidates[Math.floor(Math.random()*candidates.length)].key; //选择一个随机的
  }
}

let currentServices = new CurrentServices();
// 注册一个服务，返回所有已注册的服务，如果没有服务名，则不注册服务，只返回所有服务
// 如果指定一个过期的expire，则删除服务
export async function proxy(console:Console, req:Request, res:Response) {
  let service = req.originalUrl.slice('/api/'.length).split('/')[0];
  req.url = req.originalUrl;
  innerProxy(console, service, req, res, 3);
}

function innerProxy(console, service, req, res, retry, failedAddr?) {
  if (retry <= 0) {
    return res.status(502).send(`service ${service} proxy error retry: ${retry}`);
  }
  let dest = currentServices.allocateService(service, failedAddr);
  if (!dest) {
    return res.status(502).send(`service ${service} found no dest`);
  }
  console.log(`proxying request to ${dest}`);
  let eproxy = require('express-http-proxy');
  eproxy(dest)(req, res, (err)=>{
    console.log(`proxied request to ${dest} failed`, err);
    innerProxy(console, service, req, res, retry-1, dest);
  });

}
