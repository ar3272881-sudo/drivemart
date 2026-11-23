const User=require('../models/User');
async function requireVerifiedEmail(req,res,next){
 if(process.env.REQUIRE_EMAIL_VERIFICATION!=='true')return next();
 if(!req.session.user)return res.redirect('/login');
 try{const user=await User.findById(req.session.user.id).select('emailVerified').lean();
 if(!user)return res.redirect('/login');
 if(!user.emailVerified){req.flash('error','Please verify your email before using this feature.');return res.redirect('/verify-email');}
 return next();}catch(error){next(error)}
}
module.exports={requireVerifiedEmail};
