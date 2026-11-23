const path=require('path'), ejs=require('ejs');
const root=path.join(__dirname,'..');
const car={_id:'507f191e810c19729de860ea',image:'',brand:'Toyota',model:'Corolla',price:4000000,year:2020,city:'Lahore',mileage:53000,status:'available',approvalStatus:'approved',gallery:[{url:'https://example.com/car.webp',publicId:''}],seller:'507f191e810c19729de860eb',location:{type:'Point',coordinates:[74.3,31.5]},analytics:{saves:1,bids:2,messages:3}};
const user={id:'507f191e810c19729de860ec',name:'Ali',role:'buyer',email:'ali@example.com',city:'Lahore',favorites:[]};
const helpers=require('../utils/helpers');
const defaults={pageTitle:'Testing',currentUser:user,isAdmin:false,csrfToken:'abc',flash:null,bodyClass:'',currentYear:2026,hideSimpleFooter:false,emailVerificationEnabled:true,...helpers};
const cases={
 'profile':{user:{...user,emailVerified:true},error:''},
 'favorites':{cars:[car]},
 'recommendations':{cars:[car]},
 'notifications':{notifications:[{_id:'507f191e810c19729de860ed',type:'bid',url:'/my-bids',text:'New offer',readAt:null,createdAt:new Date()}]},
 'verify-email':{user:{...user,emailVerified:false},configured:true},
 'seller-dashboard':{cars:[car],currentUser:{...user,role:'seller'}},
 'seller-car-form':{car,mode:'edit',error:'',currentUser:{...user,role:'seller'}},
 'inventory':{cars:[car],count:1,search:'',status:'',city:'',brand:'',minPrice:'',maxPrice:'',minYear:'',maxYear:'',maxMileage:'',fuelType:'',transmission:'',bodyType:'',sort:'newest',page:1,totalPages:1,brands:['Toyota'],lat:'',lng:'',distance:'',allowedStatuses:['available','booked','sold'],queryParams:{}},
 'car-details':{car,isFavorite:false},
 'dashboard':{activeBookings:1,recommended:[car]},
 'fr06-chat':{car,me:user.id,buyer:user.id,seller:car.seller},
 'fr07-bids':{bids:[],sellerView:false},
 'car-form':{car,mode:'edit',error:'',currentUser:{...user,role:'admin'},isAdmin:true}
};
(async()=>{for(const [name,loc] of Object.entries(cases)){
 try{const html=await ejs.renderFile(path.join(root,'views',name+'.ejs'),{...defaults,...loc});
 if(!html.includes('</html>'))throw Error('Missing footer');
 console.log('RENDER_OK',name,html.length);
 }catch(err){console.error('RENDER_FAILED',name,err);process.exitCode=1;}
}})();
