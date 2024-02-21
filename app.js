const express = require('express')
const bodyParser = require('body-parser')
const mongodb = require("mongodb")
const cookieParser = require("cookie-parser")
const { v4: uuidv4 } = require('uuid')

const app = express()
const port = 7777
const jsonParser = bodyParser.json()
app.use(jsonParser)
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.set("view-engine", "ejs")

const mdbClient = new mongodb.MongoClient("mongodb://localhost:27017")
let dbo = null

async function dbinit(){
    await mdbClient.connect()
    dbo = mdbClient.db("day_3")
    app.listen(port)
    console.log("DB Connected, Listening on port: " + port)
}
dbinit()

app.get("/", function(req, res){ res.render('reg.ejs') })

app.post("/register", async function(req, res){

    const user = req.body
    await dbo.collection("users").insertOne(user)
    res.redirect('signin')

})

app.get("/signin", function(req, res){ res.render('login.ejs') })

app.post("/login", async function(req, res){
    let data = req.body
    if( data.username != "" ){
        let user = await dbo.collection("users").findOne({username:data.username, password:data.password})
        if(user){

            const uuid = uuidv4()
            await dbo.collection("users").updateOne({ _id: user._id }, { $set: {sid: uuid} })
            res.cookie("sid", uuid)

            res.redirect('index')

        } else { res.send({ msg:"Failed, User not found." }) }
    } else { res.send({ msg:"Failed, data not valid" }) }
})

async function auth(req, res, next){
    if(req.cookies.sid){
        let user = await dbo.collection("users").findOne({ sid:req.cookies.sid })
        if(user){

            req.user = user
            next()
        } else { res.send({ msg:"No User Found." }) }
    } else { res.send({ msg:"Couldn't Find sID." }) }
}

app.get("/currentuser", auth, function(req, res){ res.send(req.user) })

app.get("/index", auth, async function(req, res){

    let msg = "Welcome!"
    let users = await dbo.collection("users").find().toArray()
    let sessID = req.user.sid

    res.render('index.ejs', {users, msg, sessID })
})
