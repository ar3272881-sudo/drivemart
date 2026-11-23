const Car = require('../models/Car');
const User = require('../models/User');
const CarView = require('../models/CarView');
const publicFilter = {status:'available',hiddenByAdmin:{$ne:true},$or:[{approvalStatus:'approved'},{approvalStatus:{$exists:false}}]};
async function recommendations(userId, limit=8) {
  const user = userId ? await User.findById(userId).select('favorites city').lean() : null;
  const viewed = userId ? await CarView.find({user:userId}).sort({lastViewedAt:-1}).limit(25).populate('car','brand model price city bodyType').lean() : [];
  const favorites = (user?.favorites||[]).map(String);
  const interests = await Car.find({_id:{$in:[...favorites,...viewed.map(v=>String(v.car?._id||''))]}}).select('brand model price city bodyType').lean();
  const candidates=await Car.find(publicFilter).sort({createdAt:-1}).limit(350).lean();
  const rated=candidates.map(car=>{
    let score=0;
    for(const liked of interests){
      if(car.brand===liked.brand)score+=4;
      if(car.bodyType&&car.bodyType===liked.bodyType)score+=2;
      if(car.city&&car.city.toLowerCase()===String(liked.city||'').toLowerCase())score+=1;
      if(liked.price&&Math.abs(car.price-liked.price)/liked.price<=0.25)score+=2;
    }
    if(user?.city&&user.city.toLowerCase()===String(car.city||'').toLowerCase())score+=2;
    score+=Math.log1p(car.views||0)/4;
    return {car,score};
  }).sort((a,b)=>b.score-a.score||new Date(b.car.createdAt)-new Date(a.car.createdAt));
  return rated.filter(x=>!favorites.includes(String(x.car._id))).slice(0,Math.max(1,Math.min(limit,20))).map(x=>x.car);
}
module.exports={recommendations,publicFilter};
