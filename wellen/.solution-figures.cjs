const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function graph({title,xMax,yMax,xLabel='t in s',yLabel='y in cm',curves,ticks}){
 const X=x=>65+590*x/xMax,Y=y=>145-90*y/yMax;
 const grid=(ticks||[0,xMax/4,xMax/2,3*xMax/4,xMax]).map(t=>`<line x1="${X(t)}" y1="45" x2="${X(t)}" y2="245" stroke="#e2e8f0"/><text x="${X(t)}" y="267" text-anchor="middle">${String(Number(t.toFixed(3))).replace('.',',')}</text>`).join('');
 let paths='';
 for(const [i,c] of curves.entries()){
  const points=Array.from({length:1001},(_,j)=>{const x=j*xMax/1000;return `${X(x).toFixed(2)},${Y(c.fn(x)).toFixed(2)}`}).join(' ');
  const color=c.color||['#1565c0','#c0264d','#15803d'][i%3];
  paths+=`<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${points}"/><text x="${70+i*195}" y="305" fill="${color}">${esc(c.label||'')}</text>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 330" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><g font-family="Arial,sans-serif" font-size="15" fill="#172033"><text x="65" y="25">${esc(title)}</text>${grid}<line x1="65" y1="145" x2="670" y2="145" stroke="#172033"/><line x1="65" y1="45" x2="65" y2="245" stroke="#172033"/><text x="20" y="59">${yMax}</text><text x="15" y="242">−${yMax}</text><text x="20" y="151">0</text><text x="70" y="47">${esc(yLabel)}</text><text x="570" y="287">${esc(xLabel)}</text>${paths}</g></svg>`;
}
function scheme(title,labels){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 115" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><g fill="#172033" font-family="Arial,sans-serif" font-size="15"><text x="20" y="24">${esc(title)}</text>${labels.map((label,i)=>{const x=25+i*(665/labels.length),w=620/labels.length;return `<rect x="${x}" y="45" width="${w}" height="42" fill="#eef6f8" stroke="#477785"/><text x="${x+7}" y="70">${esc(label)}</text>${i<labels.length-1?`<text x="${x+w+1}" y="70">→</text>`:''}`}).join('')}</g></svg>`;
}
function waveTypes(){
 const dots=Array.from({length:23},(_,i)=>{const x=50+i*26;return `<circle cx="${x}" cy="${82-28*Math.sin(i*Math.PI/5)}" r="4" fill="#1565c0"/><circle cx="${x+12*Math.sin(i*Math.PI/5)}" cy="180" r="4" fill="#c0264d"/>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 235" role="img" aria-label="Transversal: Teilchen auf und ab. Longitudinal: Teilchen vor und zurück."><g font-family="Arial,sans-serif" font-size="16" fill="#172033"><text x="30" y="25">Transversal: Bewegung ↑↓, Ausbreitung →</text><line x1="30" y1="82" x2="680" y2="82" stroke="#aaa"/><text x="30" y="145">Longitudinal: Bewegung ↔, Ausbreitung →</text>${dots}<text x="70" y="215">Verdichtungen</text><text x="310" y="215">Verdünnungen</text></g></svg>`;
}
module.exports={graph,scheme,waveTypes};
