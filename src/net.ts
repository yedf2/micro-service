let request = require('request');
// request.debug = true;
import {printable} from './logger';
import * as _ from 'underscore';

export async function get(console:Console, url, options?):Promise<string> {
  return new Promise<string>(function(resolve, reject) {
    console.log(`getting ${url}`, options||'');
    let opts = {url, headers:{'x-request-id':console['request_id']}};
    request(_.extend(opts, options), function(err, response, body) {
      console.log(`get ${url} body: ${body.length>10*1024?'length:'+body.length : body}`);
      err && reject(err) || resolve(body);
    });
  });
}

export async function getJson(console:Console, url, options?) {
  return get(console, url, options).then(function(res:any) {
    let body = JSON.parse(res);
    if (body.errcode || body.code) return Promise.reject(body);
    return Promise.resolve(body);
  });
}

export async function getBinary(console:Console, url, options?): Promise<any> {
  return new Promise<any>(function(resolve, reject) {
    let data = [];
    console.log(`getting raw ${url}`);
    let opts = {url, headers:{'x-request-id':console['request_id']}};
    request(_.extend(opts, options)).on('response', (response)=>{
      response.setEncoding('binary');
      response.on('data', chunk=>{
        data.push(chunk);
      }).on('end',()=> {
        let all = data.join('');
        console.log(`get raw ${url} body length: ${all.length}`);
        resolve(all);
      });
    });
  });
}

export async function put(console:Console, url, data, options?): Promise<any> {
  return new Promise<string>(function (resolve, reject) {
    console.log(`putting raw ${url} data length: ${data.length}`);
    request(_.extend({
      url: url,
      method: 'PUT',
      body: data
    }, options), (err, response, body) => {
      console.log(`put ${url} body ${printable(data)} err ${err} return body ${printable(body)}`);
      err && reject(err) || resolve(body);
    });
  })
}

export async function putJson(console:Console, url, data, options?):Promise<any> {
  return put(console, url, JSON.stringify(data), options).then(function(res:any) {
    return Promise.resolve(JSON.parse(res));
  });
}

export async function post(console:Console, url, data, options?):Promise<string> {
  return new Promise<string>(function(resolve, reject) {
    console.log(`posting raw ${url} data length: ${printable(data)}`);
    request(_.extend({
      url: url,
      method: 'POST',
      headers:{'x-request-id':console['request_id']},
      body: data
    }, options), (err, response, body) => {
      console.log(`post ${url} body ${printable(data)} err ${err} return body ${printable(body)}`);
      err && reject(err) || resolve(body);
    });
  });
}

export async function postJson(console:Console, url,data,options?):Promise<any> {
  return post(console, url,data, _.extend({json:true},options)).then(function(res:any) {
    return Promise.resolve(res);
  })
}

export async function postStream(console:Console, url, data, options?):Promise<any> {
  return post(console, url,data, _.extend({headers: {'Content-Type': 'application/octet-stream'}},options)).then(function(res:any) {
    return Promise.resolve(res);
  })
}

export async function postForm(console:Console, url, formData, options?):Promise<any> {
  return new Promise((resolve,reject) => {
    console.log(`posting ${url} form: ${printable(formData)}`);
    request.post(_.extend({url:url,formData:formData,headers:{'x-request-id':console['request_id']}}, options), (err,response,body)=> {
      console.log(`post ${url} body ${printable(formData)} err ${err} body ${printable(body)}`);
      err && reject(err) || resolve(body);
    })
  });
}

export async function postFormUrlEncoded(console:Console, url, form, options?):Promise<any> {
  return new Promise((resolve,reject) => {
    console.log(`posting ${url} form: ${printable(form)}`);
    request.post(_.extend({url:url,form:form,headers:{'x-request-id':console['request_id']}}, options), (err,response,body)=> {
      console.log(`post ${url} body ${printable(form)} err ${err} body ${printable(body)}`);
      err && reject(err) || resolve(body);
    })
  });
}

export async function postFormJson(console:Console, url, formData, options?) {
  let r:any = await postForm(console, url, formData, options);
  return JSON.parse(r);
}
