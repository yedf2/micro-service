micro-service a mirco service framework/一个简单的node微服务框架
====

#特点

*   基于http协议----方便跨语言使用
*   [自动服务发现](README-center.md)----自动管理并发现新加入的服务
*   [微服务高可用](README-center.md)----自动剔除故障的微服务，并对失败的请求重试
*   [微服务负载均衡](README-center.md)----自动在多个微服务实例上做负载均衡
*   ELK日志集成（即将上线）

#安装

    npm install m-service --save

#使用

##编写服务处理函数

```javascript
// dir1/file1.js
// 使用传入的console参数输出可以自动在日志里带上request id，便于跟踪一个请求在所有微服务上的日志
// 返回值如果是非null，则会把该值JSON.stringify后作为结果返回，若是promise，则等待promise的结果再返回
module.exports.f1 = (console, query, body, req, res)=>{
	return {query, body, msg:'success'};
}
```

##普通web服务模式

按照普通的web方式的方式提供服务

```javascript
// web.js
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
// s1.js
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
// dir2/file2.js
module.exports.f = (console, query, body)=>{
	return {query, body, msg:'success'};
}

// s2.js
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

    localhost:4999/api/dir1/file1/f1?p1=1&p2=2&&通过代理访问微服务
    localhost:4999/api/dir2/file1/f1?p1=1&p2=2&&通过代理访问微服务

##开发
```
git clone https://github.com/yedf/micro-service.git
cd micro-service
cnpm install
sudo cnpm install -g typescript
npm start #启动微服务的注册中心、代理、服务名称为dir1的微服务
```

启动另一个微服务dir2

    cd example && node s2.js

##只启动服务中心或代理
```
// /etc/m-service.conf
{
  centers:"http://localhost:5000/api/center", //指定服务中心
  center:{ //启动center，用于服务发现
    port:5000,
    dataFile:'/var/log/m-service.json', //保存当前已注册服务，重启不失效
  },
  proxy:{ //启动proxy，自动处理服务发现，失败重试
    port:4999,
  }
}
```
cnpm i -g m-service

m-service
