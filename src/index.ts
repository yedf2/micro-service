let ms = require('./app');
module.exports.createApp = ms.createApp;

!module.parent && ms.createApp({
  centers:"http://localhost:5000/api/center",
  center:{
    port:5000,
    dataFile:'/var/log/m-service.json',
  },
  proxy:{
    port:4999,
  },
  services:{
    port: 5500,
    dir: __dirname,
    names:['dir1'],
  }
});


