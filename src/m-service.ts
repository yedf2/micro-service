import {globalInit} from './app';
import {loadJsonConf} from './util';
import * as ms from './app';

let file = process.argv[2];
if (!file)
  file = '/etc/m-service.json';
globalInit();

async function main() {
  let conf = await loadJsonConf(file);
  console.log('conf is: ', conf);
  ms.createApp(conf);
}

main();
