let request = require('request');
// request.debug = true;
import {logger as console} from './logger';
import * as _ from 'underscore';
let crypto = require('crypto');

export function setInterval2(cb, interval, next) {
  setTimeout(()=>{
    cb();
    setInterval(cb, interval)
  }, next);
}

export async function loadJsonConf(filename) {
  let fs = require('fs');
  if (await fs.existsAsync(filename)) {
    let cont = await fs.readFileAsync(filename);
    try {
      if (cont)
        return JSON.parse(cont);
    } catch (err) {
      console.log('config content is:', cont);
      throw new Error(`bad config file ${filename}`);
    }
  }
  return {};
}

export function getTimeStamp(){
  return Math.floor(new Date().getTime()/1000);
}

export function md5(content) {
  let md5 = crypto.createHash('md5');
  md5.update(content);
  let r = md5.digest('hex');
  console.log(`${content} calculated to ${r}`);
  return r;
}

export async function catchError(p):Promise<any> {
  return new Promise(resolve=>{
    p.then(r=>{
      resolve({result:r});
    }, e=>{
      resolve({error:e})
    })
  });
}

export function toIdMap(rows, field?) {
  let result = {};
  field = field || 'id'
  _.each(rows, r => result[r[field]] = r);
  return result;
}

export function escape2Html(str) {
  let arrEntities={'lt':'<','gt':'>','nbsp':' ','amp':'&','quot':'"'};
  str = str.replace(/&(lt|gt|nbsp|amp|quot);/ig,
    (all,t)=>{
      return arrEntities[t];
    });
  return str;
}

export function parseQuery(url) {
  let query = url.split('?')[1] || '';
  let vars = query.split('&');
  let r = {};
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split('=');
    if(!pair[0] || !pair[1]) continue;
    r[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return r;
}

