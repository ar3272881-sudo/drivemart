const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const path=require('node:path');
const Car=require('../models/Car');
const helpers=require('../utils/helpers');
const sample={_id:'507f191e810c19729de860ea',brand:'Toyota',model:'Corolla',price:3000000,year:2020,mileage:1000,city:'Lahore',image:'',status:'available',approvalStatus:'approved',gallery:[]};

test('Advanced inventory endpoint applies numeric filters, 2dsphere nearby search and does not require login for guests',async()=>{
 const previous={find:Car.find,count:Car.countDocuments,distinct:Car.distinct};
 const captured={};
 Car.find=query=>{captured.find=query;return {sort(){return this},skip(){return this},limit(){return this},lean:async()=>[sample]}};
 Car.countDocuments=async query=>{captured.count=query;return 1};
 Car.distinct=async()=>['Toyota'];
 const app=express();app.set('views',path.join(__dirname,'..','views'));app.set('view engine','ejs');
 app.use((req,res,next)=>{req.session={};req.flash=()=>{};Object.assign(res.locals,{currentUser:null,flash:null,isAdmin:false,csrfToken:'test',currentYear:2026,bodyClass:'',hideSimpleFooter:false,emailVerificationEnabled:false,pageTitle:'DriveMart',...helpers});next()});
 app.use(require('../routes/enhancedRoutes'));
 app.use(require('../routes/publicRoutes'));
 app.use((e,req,res,next)=>{console.error(e);res.status(500).send(String(e))});
 const server=app.listen(0);
 try{
  const port=server.address().port;
  let response=await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status,200,'Guest homepage should not redirect to login');
  response=await fetch(`http://127.0.0.1:${port}/inventory?minYear=2018&maxYear=2022&maxMileage=25000&fuelType=petrol&sort=price_asc`);
  assert.equal(response.status,200,await response.text());
  assert.equal(captured.find.year.$gte,2018);
  assert.equal(captured.find.year.$lte,2022);
  assert.equal(captured.find.mileage.$lte,25000);
  assert.equal(captured.find.fuelType,'petrol');
  response=await fetch(`http://127.0.0.1:${port}/inventory?lat=31.52&lng=74.35&distance=30`);
  assert.equal(response.status,200);
  assert.equal(captured.find.location.$near.$maxDistance,30000);
  assert.ok(captured.count.location.$geoWithin.$centerSphere);
  response=await fetch(`http://127.0.0.1:${port}/profile`,{redirect:'manual'});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'/login');
 }finally{await new Promise(resolve=>server.close(resolve));Object.assign(Car,previous);}
});
