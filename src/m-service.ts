// async function main() {
//   let conf = await loadJsonConf('/etc/m-service.json');
//
//   if (_.isEmpty(conf)) { //配置为空，启动center
//     conf.center = {port:5000};
//   }
//   if (conf.center) {
//     ms.createGlobalCenter(app, conf);
//   }
//   ms.createServices(app, {
//     dir: __dirname,
//     services: ['example'],
//     centers: conf.proxy.centers,
//     port: 4000
//   });
//   if (conf.proxy) {
//     ms.createGlobalProxy(app, conf);
//   }
//   console.log(`before listen used ${new Date().getTime()-begin} ms`);
// }
//
