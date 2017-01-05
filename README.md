micro-service a mirco service framework/一个简单的node微服务框架
====

#安装

    npm install m-service --save

#使用

##编写服务处理函数

```javascript
//./dir1/file1.js
// 使用传入的console参数输出可以自动在日志里带上request id，便于跟踪一个请求在所有微服务上的日志
// 返回值如果是非null，则会把该值JSON.stringify后作为结果返回，若是promise，则等待promise的结果再返回
module.exports.f1 = (console, query, body, req, res)=>{
	return {query, body, msg:'success'};
}
```

##普通web服务模式

按照普通的web方式的方式提供服务

```javascript
//./web.js
let ms = require('m-service');

ms.createApp({
  services:{
    port: 5500,
    dir: __dirname,
    names:['dir1'],
  }
});

//localhost:4000/api/dir1/file1/f1?p1=1&p2=2
```

##微服务模式：

分三个角色

*   服务中心----服务注册，服务发现
*   服务代理----提供集成的web接口，用户使用统一的url访问所有微服务，屏蔽微服务内部的细节
*   微服务----提供实际的处理服务，并将服务注册到服务中心

###启动三个服务角色
```javascript
let ms = require('m-service');

ms.createApp({
  centers:"http://localhost:5000/api/center", //指定服务中心
  center:{ //启动center，用于服务发现
    port:5000,
    dataFile:'/var/log/m-service.json',
  },
  proxy:{ //启动proxy，自动处理服务发现，失败重试
    port:4999,
  },
  services:{ //启动服务
    port: 5500,
    dir: __dirname,
    names:['dir1'],
  }
});

//localhost:5500/api/dir1/file1/f1?p1=1&p2=2&直接访问微服务
//localhost:4999/api/dir1/file1/f1?p1=1&p2=2&通过代理访问微服务
//localhost:5000/api/center/register&查看在线服务
```
###只启动微服务
```javascript
//./dir2/file2.js
module.exports.f = (console, query, body)=>{
	return {query, body, msg:'success'};
}

let ms = require('m-service');
ms.createApp({
  centers:"http://localhost:5000/api/center", //指定服务中心
  services:{ //启动服务
    port: 5501,
    dir: __dirname,
    names:['dir2'],
  }
});

```
现在可以访问代理直接访问所有微服务
//localhost:4999/api/dir2/file2/f?p1=1&p2=2&通过代理访问微服务
//localhost:4999/api/dir1/file2/f?p1=1&p2=2&通过代理访问微服务

