export class PodcastDiaryStore {
 constructor(){this.db=null;}
 async open(){
  if(this.db)return this.db;
  this.db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('podguest-diary',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'id'});
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(new Error('일기장을 사용하는 다른 창을 닫아주세요.'));
  });return this.db;
 }
 async run(mode,action){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('entries',mode);const req=action(tx.objectStore('entries'));tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('저장 중단'));});}
 put(entry){return this.run('readwrite',store=>store.put(entry));}
 list(){return this.run('readonly',store=>store.getAll());}
}
