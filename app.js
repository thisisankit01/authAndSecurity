//jshint esversion:6
import express from 'express'
import dotenv from 'dotenv'
import ejs from 'ejs'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import session from 'express-session'//The session middleware function is used to manage sessions in Express. It allows you to store data in a session object, which is available on the request object in your route handlers. 
import passport from 'passport'
import passportLocalMongoose from 'passport-local-mongoose'

dotenv.config();

////////////////////connected to PORT///////////////////////////
const PORT = 3000;
const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({ //The app.use() method is used to add middleware functions to an Express application.

   secret: "Our little Secret", //This option is used to set a secret string that will be used to sign the session ID cookie.
   resave: false, //This option is used to specify whether the session should be saved even if it has not been modified. If this option is set to false, the session will only be saved if it has been modified.
   saveUninitialized: false //This option is used to specify whether uninitialized sessions should be saved. If this option is set to false, uninitialized sessions will not be saved.

}));

app.use(passport.initialize()); //initialized passport
app.use(passport.session()); //used passport to manage all sessions

///////////////////////////////database Schema and Connecionn//////////////////////////
mongoose.connect(`mongodb+srv://${process.env.dbUsername}:${process.env.dbPassword}@cluster0.kvppdtr.mongodb.net/userDB?retryWrites=true&w=majority`,function(err){
  if(!err){
    console.log("connected to db");
  }
  else {
    console.log(err);
  }
})
const userSchema = new mongoose.Schema({
  email: String,
  password : String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//////////////////////////////////requests//////////////////////////////////////


app.get('/',function(req,res){
  res.render("home");
})

app.get('/login',function(req,res){
  res.render("login");
})

app.get('/register',function(req,res){
  res.render("register");
})

app.post('/register',function(req,res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newUser = new User({
      email: req.body.username,
      password : hash
  })
  newUser.save(function(err){
    if (err){
      console.log(err)
    }
    else{
      res.render("secrets")
    }
  })
  })
})

app.post('/login',function(req,res){
  const username = req.body.username
  const password = req.body.password

  User.findOne({email : username},function(err, foundUser){
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        bcrypt.compare(password, foundUser.password, function(err, result) {
          if(result === true){
            res.render("secrets")
          }
      });
     
        
      }
    }
  })
});

///////////////////////////////////localhost//////////////////////////////////////////
app.listen(PORT, ()=>{
  console.log(`listening to ${PORT}`);
});
