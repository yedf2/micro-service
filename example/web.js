let ms = require('../lib/index');

ms.createApp({
  services:{
    port: 5500,
    dir: __dirname,
    names:['dir1'],
  }
});
