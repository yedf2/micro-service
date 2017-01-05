let ms = require('../lib/index');

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
