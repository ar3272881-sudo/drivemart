const test=require('node:test');
const assert=require('node:assert/strict');
const {PassThrough}=require('node:stream');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const Car=require('../models/Car');
const User=require('../models/User');
const Notification=require('../models/Notification');
const EmailVerification=require('../models/EmailVerification');
const {notify,subscribe}=require('../services/notifications');
const {sendCode,verifyCode}=require('../services/emailVerification');
const carId='507f191e810c19729de860ea';
const userId='507f191e810c19729de860eb';

test('Car model supports up to four additional gallery images, vehicle specifications and optional coordinates',async()=>{
 const car=new Car({brand:'Toyota',model:'Corolla',year:2023,price:5300000,location:{type:'Point',coordinates:[74.3,31.5]},gallery:[{url:'photo.webp'}],fuelType:'hybrid',transmission:'automatic',bodyType:'sedan',engineCC:1800});
 await car.validate();
 assert.equal(car.gallery.length,1);
 assert.equal(car.location.coordinates[1],31.5);
 assert.equal(car.fuelType,'hybrid');
 assert.equal(car.views,0);
 const invalid=new Car({brand:'Toyota',model:'Corolla',year:2023,price:1,fuelType:'rocket'});
 await assert.rejects(()=>invalid.validate(),/fuelType/);
});

test('Profile and favorites fields are available without changing old user auth schema',async()=>{
 const user=new User({name:'Ali Raza',email:'ali@test.com',role:'buyer',passwordHash:'fakeHash',favorites:[carId],city:'Lahore',phone:'03001234567'});
 await user.validate();
 assert.equal(user.favorites.length,1);
 assert.equal(user.emailVerified,true);
 assert.equal(user.city,'Lahore');
});

test('Notification model prevents invalid types',async()=>{
 const good=new Notification({user:userId,type:'bid',text:'You have an offer',url:'/my-bids'});
 await good.validate();
 await assert.rejects(()=>new Notification({user:userId,type:'unsupported',text:'x'}).validate(),/type/);
});

test('Live user notifications stream only to subscribed user via SSE',async()=>{
 const original=Notification.create;
 Notification.create=async values=>({_id:carId,...values});
 const a={content:'',write(x){this.content+=x}};
 const b={content:'',write(x){this.content+=x}};
 const closeA=subscribe(userId,a),closeB=subscribe('507f191e810c19729de860ec',b);
 try{
  await notify(userId,'message','New message','/chat/'+carId);
  assert.match(a.content,/event: update/);
  assert.match(a.content,/New message|"type":"message"/);
  assert.doesNotMatch(b.content,/event: update/);
 }finally{closeA();closeB();Notification.create=original;}
});

test('Six-digit email code uses secret HMAC and verifies with rate-limited attempts',async()=>{
 const old={gmail:process.env.GMAIL_USER,app:process.env.GMAIL_APP_PASSWORD,secret:process.env.EMAIL_OTP_SECRET,enabled:process.env.REQUIRE_EMAIL_VERIFICATION};
 Object.assign(process.env,{REQUIRE_EMAIL_VERIFICATION:'true',GMAIL_USER:'test@gmail.com',GMAIL_APP_PASSWORD:'test-app-password',EMAIL_OTP_SECRET:'test-secret-for-otp'});
 const mailer=require('../services/mailer');
 const methods={one:EmailVerification.findOne,update:EmailVerification.findOneAndUpdate,del:EmailVerification.deleteOne,userUpdate:User.updateOne,send:mailer.sendMail};
 const db={verification:null,updated:null,code:null};
 mailer.sendMail=async message=>{db.code=message.text.match(/\b\d{6}\b/)[0];return {messageId:'test-message'};};
 EmailVerification.findOne=async()=>db.verification;
 EmailVerification.findOneAndUpdate=async(q,update)=>{db.verification={...update.$set,save:async()=>{}};return db.verification;};
 EmailVerification.deleteOne=async()=>{db.verification=null;};
 User.updateOne=async(q,update)=>{db.updated=update.$set;};
 global.fetch=async(url,options)=>{db.code=JSON.parse(options.body).text.match(/\b\d{6}\b/)[0];return {ok:true}};
 try{
  await sendCode({_id:userId,email:'ali@test.com'});
  assert.match(db.code,/^\d{6}$/);
  assert.notEqual(db.verification.codeHash,db.code);
  assert.equal(await verifyCode({_id:userId},'000000'),false);
  assert.equal(db.verification.attempts,1);
  assert.equal(await verifyCode({_id:userId},db.code),true);
  assert.equal(db.updated.emailVerified,true);
  assert.equal(db.verification,null);
 }finally{
  EmailVerification.findOne=methods.one;EmailVerification.findOneAndUpdate=methods.update;EmailVerification.deleteOne=methods.del;User.updateOne=methods.userUpdate;mailer.sendMail=methods.send;
  for(const [key,prop] of Object.entries({gmail:'GMAIL_USER',app:'GMAIL_APP_PASSWORD',secret:'EMAIL_OTP_SECRET',enabled:'REQUIRE_EMAIL_VERIFICATION'})){if(old[key]===undefined)delete process.env[prop];else process.env[prop]=old[key];}
 }
});

test('All enhanced EJS screens render complete HTML',()=>{
 const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/render-check.js')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/RENDER_OK inventory/);
 assert.match(result.stdout,/RENDER_OK seller-car-form/);
 assert.match(result.stdout,/RENDER_OK fr06-chat/);
});
