const asyncHandler = require ("express-async-handler")
const User = require ("../models/userModel")
const jwt = require("jsonwebtoken")
const bcrypt = require ("bcryptjs")
const Token = require("../models/tokenModel")
const crypto = require ("crypto")
const sendEmail = require("../utils/sendEmail")



const generatetoken =(id)=>{
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: "1d"})
}

//register user
const registerUser = asyncHandler (async(req,res)=>{
   const {name,email,password} = req.body

   //validation
   if(!name || !email ||!password){
    res.status(400)
    throw new Error ("please fill all the required fields")
   }
   if(password.length < 8){
    res.status(400)
    throw new Error ("password must be atleast 8 characters")
   }

   // check if already user email exists
   const userExists = await User.findOne({email})

   if(userExists){
    res.status(400)
    throw new Error ("user email already exists")
   }

   //create new user
   const user = await User.create({
    name,
    email,
    password 
   })

   //generate token
   const token = generatetoken(user._id);

   //send HTTP-only cookie
   res.cookie("token",token,{
    path : "/",
    httpOnly : true,
    expires : new Date(Date.now() + 1000 * 86400),
    sameSite : "none",
    secure : true
   })

   if(user){
    const{_id,name,email,photo,phone,bio} = user
    res.status(201).json({
        _id, name, email, photo, phone, bio, token
    })
   } else{
    res.status(400)
    throw new Error ("Invalid user data")
   }
});

  //loginuser
  const loginUser = asyncHandler(async (req,res) =>{
     
    const {email,password} = req.body
    // validaion
    if(!email || !password){
        res.status(400)
        throw new Error ("please enter a email and password")
    }

    //check if user exists
    const user = await User.findOne({email})
    if(!user){
        res.status(400)
        throw new Error ("user not found, please signup")
    }

    //if user exists, check if password is correct
    const passwordIscorrect = await bcrypt.compare(password, user.password)

    //generate token
   const token = generatetoken(user._id);

   //send HTTP-only cookie
   res.cookie("token",token,{
    path : "/",
    httpOnly : true,
    expires : new Date(Date.now() + 1000 * 86400),
    sameSite : "none",
    secure : true
   })

    if(user && passwordIscorrect){
        const{_id,name,email,photo,phone,bio} = user
    res.status(200).json({
        _id, name, email, photo, phone, bio, token
    })
    }else{
        res.status(400)
        throw new Error("email or password is incorrect")
    }
  });

  //logout user
  const logout = asyncHandler(async(req, res)=>{
    res.cookie("token","",{
        path : "/",
        httpOnly : true,
        expires : new Date(0),
        sameSite : "none",
        secure : true
       });
       return res.status(200).json({message : "Successfully logged out"})
  });

  //getuser data
  const getUser = asyncHandler(async(req, res)=>{
     const user = await user.findById(req.user._id)

     if(user){
        const{_id,name,email,photo,phone,bio} = user
        res.status(200).json({
            _id, name, email, photo, phone, bio
        })
       } else{
        res.status(400)
        throw new Error ("user not found")
       }
  });

  //get login status
  const loginStatus = asyncHandler(async(req , res)=>{
    const token = req.cookies.token;
    if(!token){
        return res.json(false)
    }
    
    //verify token
    const verified = jwt.verify(token,process.env.JWT_SECRET)
    if(verified){
        return res.json(true)
    }
     return res.json(false)
  });

  //user update
  const updateUser = asyncHandler(async(req,res)=>{
    const user = await User.findById(req.user._id)

    if(user){
        const{name,email,photo,phone,bio} = user;
        user.email = email;
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.photo = req.body.photo || photo;
        user.bio = req.body.bio || bio;

        const updateUser = await user.save()
        res.status(200).json({
            _id : updateUser._id,
            name : updateUser.name,
            email : updateUser.email, 
            photo : updateUser.photo, 
            phone : updateUser.phone, 
            bio : updateUser.bio
        })
    }else{
        res.status(404)
        throw new Error("user not found")
    }
  });

  //change password
  const changePassword = asyncHandler(async(req,res)=>{
    const user = await User.findById(req.user._id)
    const {oldpassword,password} = req.body
    if(!user){
        res.status(400)
        throw new Error("user not found,please signup")
    }

    //validation
    if(!oldpassword || !password){
        res.status(400)
        throw new Error("please enter a old password and password")
    }

    //check if old password matches new password in DB
    const passwordIscorrect = await bcrypt.compare(oldpassword,user.password)

    //save new password
    if(user && passwordIscorrect){
        user.password = password
        await user.save()
        res.status(200).send("password changed successfully")
    }else{
        res.status(400)
        throw new Error ("old password is incorrect")
    }
  });

  //forgot password
  const forgotPassword = asyncHandler(async(req,res)=>{
    const {email} =req.body
    const user =await User.findOne({email})

    if(!user){
        res.status(404)
        throw new Error("user does not exists")
    }

    //Delete token if it exists in DB
    const token = await Token.findOne({userId : user._id})
    if(token){
        await token.deleteOne()
    }

    //create reset token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    console.log(resetToken)
    //hash token before saving into DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    //save token to DB
    await new Token ({
        userId : user._id,
        token :hashedToken,
        createdAt : Date.now(),
        expiredAt : Date.now() + 30 * (60 * 1000) // 30 minutes
    }).save()

    //construct reset url
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`

    //reset email
    const message = `
        <h3>Dear ${user.name}</h3>
        <p>Please use url below to reset your password</p>
        <p>This reset link is valid only for 30 minutes</p>
        <a href = ${resetUrl} clicktracking=off>${resetUrl}</a>
        <p>Regards.....</p>
        <p>InvPro Tracker Team </p>
    `
    const subject = "Request for password reset"
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER

    try {
        await sendEmail(subject,message ,send_to, sent_from)
        res.status(200).json({success:true, message : "Reset Email Sent"})
    } catch (error) {
        res.status(500)
        throw new Error ("Email not sent, Please try again")
    }
  });

  //reset password
  const resetPassword = asyncHandler(async(req,res)=>{
    const {password} = req.body
    const {resetToken} = req.params

    //hash token,then compare to token in DB
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    //find token in DB
    const userToken = await Token.findOne({
        token : hashedToken,
        expiredAt : {$gt:Date.now()}
    })
     
    if(!userToken){
        res.status(404)
        throw new Error("Invalid or Expired Token")
    }

   //find user
   const user = await User.findOne({_id: userToken.userId})
   user.password = password
   await user.save()
   res.status(200).json({
    message : "Password Reset successful,Please Login"
   })
   
  })
module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword
}