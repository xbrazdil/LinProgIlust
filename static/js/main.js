const $=id=>document.getElementById(id);

function addConstraint(){
 const r=document.createElement('div');
 r.className='constraint-row';
 r.innerHTML=`<input type=number step=any class=coef-a required> x +
               <input type=number step=any class=coef-b required> y ≤
               <input type=number step=any class=coef-c required>`;
 $('constraints').appendChild(r);
}
function removeConstraint(){
 const c=$('constraints'); c.lastChild&&c.removeChild(c.lastChild);
}

async function drawRegion(){
 const constraints=[...document.querySelectorAll('.constraint-row')]
   .map(r=>{const a=+r.querySelector('.coef-a').value;const b=+r.querySelector('.coef-b').value;const c=+r.querySelector('.coef-c').value;return isNaN(a)||isNaN(b)||isNaN(c)?null:{a,b,c};})
   .filter(x=>x);
 const objA=+$('obj-a').value, objB=+$('obj-b').value;
 const payload={constraints};
 if(!isNaN(objA)&&!isNaN(objB)){
  payload.objA=objA; payload.objB=objB;
  payload.maximize=$('lp-form').querySelector('input[name="opt-type"]:checked').value==='max';
 }
 const res=await fetch('/compute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const r=await res.json();
 Plotly.newPlot('plot',r.data,r.layout);
 const tbl=$('tableaus'); tbl.innerHTML='';
 r.tableaus?.forEach((st,i)=>{
   const div=document.createElement('div');
   div.innerHTML=`<h3>Step ${i}</h3><table border=1>${st.tableau.map(row=>'<tr>'+row.map(v=>`<td>${Math.round(v*1000)/1000}</td>`).join('')+'</tr>').join('')}</table>`;
   div.append('Basic vars: '+st.basis.join(', '),document.createElement('br'),'Solution (x,y): ('+st.sol.x.toFixed(3)+','+st.sol.y.toFixed(3)+')');
   tbl.appendChild(div);
 });
}

window.addEventListener('DOMContentLoaded',()=>{
 $('obj-a').value=1; $('obj-b').value=1;
 [{a:1,b:1,c:5},{a:-1,b:2,c:5},{a:-1,b:0,c:0},{a:0,b:-1,c:0}].forEach(d=>{
   addConstraint();
   const r=[...document.querySelectorAll('.constraint-row')].pop();
   r.querySelector('.coef-a').value=d.a;
   r.querySelector('.coef-b').value=d.b;
   r.querySelector('.coef-c').value=d.c;
 });
});
