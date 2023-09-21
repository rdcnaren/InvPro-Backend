const mongoose = require ("mongoose")
const bcrypt = require ("bcryptjs")

const userSchema = mongoose.Schema({
   name :{
    type : String,
    required : [true,"please enter a name"]
   },
   email : {
    type : String,
    required : [true, "please enter a email"],
    unique : true,
    trim : true,
    match : [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "please enter a valid email address"
    ]
   },
   password : {
    type : String,
    required : [true , "please enter a password"],
    minLength : [8, "password must be atleast 8 characters"],
    // maxLength : [20, "password must not be more than 20 characters"]
   },
   photo : {
    type : String,
    required : [true , "please upload a photo"],
    default : "No image"
   },
   phone : {
    type : String,
    default : +917788990022
   },
   bio : {
    type : String,
    maxLength : [250, "bio must not be more than 250 characters"],
    default : "Avane pathi edhuvumey illa"
   }
},{
    timestamps : true
})

//Encrypt password before saving to DB
 userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        return next()
    }

    //hash password
   const salt = await bcrypt.genSalt(10)
   const hashedpassword = await bcrypt.hash(this.password , salt)
   this.password = hashedpassword
   next()
 })

const User = mongoose.model("User", userSchema)
module.exports = User