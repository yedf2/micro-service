let ms = require('../lib/index');
ms.createApp({
  centers:"http://localhost:5000/api/center", //指定服务中心
  services:{ //启动服务
    port: 5503,
    dir: __dirname,
    names:['dir2'],
  }
});
