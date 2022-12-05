//jshint esversion:6
import express from 'express'
import dotenv from 'dotenv'
import ejs from 'ejs'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import session from 'express-session'//The session middleware function is used to manage sessions in Express. It allows you to store data in a session object, which is available on the request object in your route handlers. 
import passport from 'passport'
import passportLocalMongoose from 'passport-local-mongoose'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import  findOrCreate from 'mongoose-findorcreate';

dotenv.config();

////////////////////connected to PORT///////////////////////////
const PORT = process.env.PORT;
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
  password : String,
  googleId: String,
  secret: String
});


userSchema.plugin(passportLocalMongoose); //setted userSchema to use passport-local-mongoose as a plugin
userSchema.plugin(findOrCreate); //

const User = new mongoose.model("User",userSchema);


/////////////////////////////////passport//////////////////////////////////////////
passport.use(User.createStrategy());


passport.serializeUser((user, done) => {
  // Convert the user object to a unique identifier
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://hidesecrets.cyclic.app/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
(accessToken, refreshToken, profile, cb) => {
  console.log(profile);
  // Use the profile information to create a new user or log them in
  User.findOrCreate({ googleId: profile.id }, (err, user) => {
    return cb(err, user);
  });
}
));

//////////////////////////////////GET requests//////////////////////////////////////


app.get('/',function(req,res){
  res.render("home");
})

app.get("/auth/google",
passport.authenticate('google',{scope:["profile"]})
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login',function(req,res){
  res.render("login");
})

app.get('/register',function(req,res){
  res.render("register");
})

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated){
    res.render("secrets")
  }
  else{
    res.redirect("/login")
  }
})

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }
  else{
    res.redirect("/login")
  }
})

app.post('/submit',function(req,res){
  const submittedSecret = req.body.secret;
  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
  }
  else{
    if(foundUser){
      foundUser.secret = submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets")
      })
    }
  }
})
})

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
     console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

//////////////////////////////////POST requests//////////////////////////////////////


app.post('/register',function(req,res){
User.register({username:req.body.username}, req.body.password, function(err,user){
  if(err){
    console.log(err);
  }
  else {
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets")
    })
  }
})
})

app.post('/login',function(req,res){
  const user = new User({
    username : req.body.username,
    password : req.body.password
  })

  req.login(user,function(err){
if(err){
  console.log(err);
}
else{
  passport.authenticate("local")(req,res,function(){
    res.redirect("/secrets")
      });
    }
  })
});

console.log("hello");


///////////////////////////////////localhost//////////////////////////////////////////
app.listen(PORT || 3000, () => console.log(`listening on 3000`));
