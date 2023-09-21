const dotenv =require ("dotenv").config();
const express =require("express");
const mongoose =require("mongoose");
const bodyParser = require("body-parser");
const cors =require("cors")
const userRoute = require ("./routes/userRoute")
const errorHandler = require ("./middleWare/errorMiddleware")
const cookieParser = require ("cookie-parser")


const app = express();

//middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:false}))
app.use(bodyParser.json())

//routes middleware
app.use("/api/users", userRoute)


//routes
app.get("/",(req,res)=>{
    res.send("Home page")
})

//error middleware
app.use(errorHandler)

//connect to mongoDB and start server

const port = process.env.port || 5000
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    app.listen(port, ()=>{
        console.log("server is running on port",port)
    })
})
.catch((err)=>console.log(err))
