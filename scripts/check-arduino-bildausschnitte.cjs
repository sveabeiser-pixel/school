const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const playwrightPath = process.env.PLAYWRIGHT_MODULE || path.join(process.env.TEMP,'school-ki2-check/node_modules/playwright');
const {chromium} = require(playwrightPath);
const {PNG} = require(path.join(path.dirname(require.resolve(playwrightPath)),'../playwright-core/lib/utilsBundle.js'));
const root = path.resolve(__dirname,'..');
const output = path.join(process.env.TEMP,'school-arduino-bildausschnitte-check');
const counts = {'arduino-3':6,'arduino-4':3,'arduino-5':4,'arduino-6':1,'arduino-motoren':1};
fs.mkdirSync(output,{recursive:true});

async function main() {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files']});
  const report=[];
  try {
    for(const width of [1440,390,320]) {
      const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      await page.route('https://**/*',route=>route.abort());
      for(const [name,count] of Object.entries(counts)) {
        await page.goto(pathToFileURL(path.join(root,'nwt',name+'.html')).href,{waitUntil:'load'});
        assert.equal(await page.locator('.arduino-crop').count(),count,name);
        for(const theme of ['default','dark','dark-blue']) {
          await page.locator('.wb-theme-select').selectOption(theme,{force:true});
          for(let index=0;index<count;index++) {
            const crop=page.locator('.arduino-crop').nth(index);
            const number=await crop.evaluate(node=>node.closest('section[data-wb-page]').dataset.wbPage);
            await page.locator(`.wb-page-list [data-wb-page="${number}"]`).first().evaluate(node=>node.click());
            const height=Math.ceil(await crop.evaluate(node=>node.getBoundingClientRect().height));
            await page.setViewportSize({width,height:Math.max(1000,height+240)});
            await crop.scrollIntoViewIfNeeded();
            const id=await crop.getAttribute('data-crop');
            const buffer=await crop.screenshot({path:path.join(output,`${name}-${id}-${width}-${theme}.png`)});
            const actual=PNG.sync.read(buffer);
            const expected=await crop.evaluate((node,size)=>{
              const style=getComputedStyle(node);
              const value=name=>Number(style.getPropertyValue(name));
              const x=value('--crop-x'),y=value('--crop-y'),w=value('--crop-w'),h=value('--crop-h');
              const image=node.querySelector('img');
              const rect=node.getBoundingClientRect(),img=image.getBoundingClientRect();
              if(!image.complete||!image.naturalWidth) throw new Error('Bild nicht geladen');
              if(image.naturalWidth!==value('--image-w')) throw new Error('Falsche Originalbreite');
              if(x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight) throw new Error('Ausschnitt außerhalb des Originals');
              const scale=rect.width/w;
              if(Math.abs(rect.height-h*scale)>1||Math.abs(img.width-image.naturalWidth*scale)>1||Math.abs(img.height-image.naturalHeight*scale)>1) throw new Error('Bildmaßstab verändert');
              if(Math.abs(img.left-(rect.left-x*scale))>1||Math.abs(img.top-(rect.top-y*scale))>1) throw new Error('Bildposition verändert');
              const canvas=document.createElement('canvas');
              canvas.width=size.width;canvas.height=size.height;
              const ctx=canvas.getContext('2d');
              ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
              ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);
              return {id:node.dataset.crop,png:canvas.toDataURL('image/png').split(',')[1]};
            },{width:actual.width,height:actual.height});
            const reference=PNG.sync.read(Buffer.from(expected.png,'base64'));
            let ink=0,pixels=0;
            for(let y=2;y<actual.height-2;y+=2) for(let x=2;x<actual.width-2;x+=2) {
              const a=(y*actual.width+x)*4;
              if(Math.min(...actual.data.subarray(a,a+3))<225) ink++;
              pixels++;
            }
            // Locator screenshots round fractional clip origins to device pixels.
            let meanError=Infinity;
            for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
              let error=0,samples=0;
              for(let y=3;y<actual.height-3;y+=2) for(let x=3;x<actual.width-3;x+=2) {
                const a=(y*actual.width+x)*4,b=((y+dy)*reference.width+x+dx)*4;
                for(let channel=0;channel<3;channel++) error+=Math.abs(actual.data[a+channel]-reference.data[b+channel]);
                samples++;
              }
              if(samples) meanError=Math.min(meanError,error/(samples*3));
            }
            const inkFraction=ink/pixels;
            assert(inkFraction>.01,`${name}/${expected.id}: leeres Bild`);
            assert(meanError<22,`${name}/${expected.id} ${width}/${theme}: gerenderte Pixel weichen vom Originalausschnitt ab (${meanError.toFixed(1)})`);
            report.push({name,id:expected.id,width,theme,meanError,inkFraction});
            await page.setViewportSize({width,height:1000});
          }
          if(name==='arduino-4') {
            const diagram=page.locator('img[src$="taster-d4-gnd.svg"]');
            const number=await diagram.evaluate(node=>node.closest('section[data-wb-page]').dataset.wbPage);
            await page.locator(`.wb-page-list [data-wb-page="${number}"]`).first().evaluate(node=>node.click());
            assert(await diagram.evaluate(node=>node.complete&&node.naturalWidth===160&&Math.abs(node.getBoundingClientRect().width/node.getBoundingClientRect().height-160/260)<.01),'Taster-Schaltbild vollständig und unverzerrt');
            const diagramPNG=PNG.sync.read(await diagram.screenshot({path:path.join(output,`${name}-taster-${width}-${theme}.png`)}));
            let ink=0;
            for(let offset=0;offset<diagramPNG.data.length;offset+=4) if(Math.min(...diagramPNG.data.subarray(offset,offset+3))<225) ink++;
            assert(ink/(diagramPNG.width*diagramPNG.height)>.01,'Taster-Schaltbild nicht leer');
            report.push({name,id:'taster',width,theme});
          }
        }
      }
      await page.close();
      console.log(`${width}px: ${Object.values(counts).reduce((sum,n)=>sum+n,0)} Ausschnitte mit Originalpixeln verglichen und Taster-Schaltbild in drei Designs geprüft.`);
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2),'utf8');
  console.log(`${report.length} Bildprüfungen erfolgreich. Screenshots: ${output}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
