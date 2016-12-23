let fs:any = require('fs');

export function getLogger(request_id): Console {
    let logger = require('tracer').console({
        format : "{{timestamp}} {{file}}:{{line}} {{request_id}} {{message}}",
        dateformat : "yyyy.mm.dd HH:MM:ss.l",
        preprocess:data=>{
            data.request_id = ''+request_id;
        }
    });
    logger.request_id = request_id;
    return logger;
}

export let logger:Console = getLogger('system');
export let nolog:any = {log:f=>f};

export function printable(body:any) {
    if (!body) return null;
    let s = typeof body == 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    if (s.length > 5*1024) return ` ... ${s.length} bytes`;
    return s;
}

export async function errorPrintable(err) {
    let sources = [''];
    let reg = /((src|dist)\/.*?):(.*?):(\d+)/;
    let matches = err.stack.match(reg);
    if (matches) {
        let file:string = matches[1];
        let line = parseInt(matches[3]);
        let column = parseInt(matches[4]);
        let lns = (await fs.readFileAsync(file)).toString('utf8').split('\n', 1000000);
        for(let l=line-4; l<line+5; l++) {
            let sl = l.toString();
            while (sl.length < 5) {
                sl = '0' + sl;
            }
            if (l-1 in lns) {
                sources.push(`${l == line ? '*' : ' '}${sl} ${lns[l - 1]}`);
                if (l == line) {
                    sources.push(Array(sl.length+column+2).join(' ') + '^');
                }
            }
        }
    }
    return err.stack.split('\n').slice(0,5).join('\n') + sources.join('\n');
}

