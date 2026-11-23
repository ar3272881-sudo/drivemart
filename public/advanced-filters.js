// Progressive enhancement: all filters still work by submitting the normal GET form without JavaScript.
(()=>{
const form=document.getElementById('inventoryFilter');if(!form)return;
let controller=null,timer=null;
const run=async(push=true)=>{
 const query=new URLSearchParams(new FormData(form));query.delete('page');
 for(const [key,value] of [...query.entries()])if(!value)query.delete(key);
 const url='/inventory?'+query.toString();
 controller?.abort();controller=new AbortController();
 try{
   const response=await fetch(url,{signal:controller.signal,headers:{Accept:'text/html'}});
   if(!response.ok)throw Error('Refresh failed');
   const html=await response.text();const documentNext=new DOMParser().parseFromString(html,'text/html');
   const nextGrid=documentNext.getElementById('inventoryResults'),nextCount=documentNext.getElementById('inventoryCount');
   if(!nextGrid || !nextCount)throw Error('Invalid response');
   document.getElementById('inventoryResults').replaceWith(nextGrid);
   document.getElementById('inventoryCount').replaceWith(nextCount);
   document.getElementById('inventoryPagination')?.remove();
   const nextPages=documentNext.getElementById('inventoryPagination');if(nextPages)document.getElementById('inventoryResults').insertAdjacentElement('afterend',nextPages);
   if(push)history.pushState({},'',url);
 }catch(error){if(error.name!=='AbortError')console.warn('Filters will use a full page request next time:',error.message);}
};
form.addEventListener('input',event=>{if(!event.target.matches('input,select'))return;clearTimeout(timer);timer=setTimeout(()=>run(),550)});
form.addEventListener('change',event=>{if(!event.target.matches('input,select'))return;clearTimeout(timer);run()});
form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);run()});
form.addEventListener('click',event=>{if(event.target.id==='findLocation'){setTimeout(()=>{if(form.lat.value&&form.lng.value)run()},1000)}});
window.addEventListener('popstate',()=>window.location.reload());
})();
