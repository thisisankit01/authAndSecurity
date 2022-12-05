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

////////////////////express///////////////////////////
const PORT = process.env.PORT;
const app = express();

                                         //app.use() method to add middleware functions to the app
app.use(express.static("public"));//express.static() middleware function serves static files from the public directory, such as images, CSS, and JavaScript files.
app.set('view engine','ejs'); //The app.set() method is used to set the 'view engine' property to 'ejs', which specifies that the app will use the ejs module to render HTML templates.
app.use(bodyParser.urlencoded({extended:true})); //The app.use() method is also used to add the body-parser middleware function, which will parse incoming request bodies in the urlencoded format.

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


userSchema.plugin(passportLocalMongoose); //The schema also uses the passport-local-mongoose plugin to add methods for handling user authentication with username and password credentials. The plugin provides methods such as register(), authenticate(), and serializeUser(), which can be used to register new users, authenticate existing users, and serialize user data for storing in a session.
userSchema.plugin(findOrCreate); //

const User = new mongoose.model("User",userSchema);


/////////////////////////////////passport//////////////////////////////////////////

passport.use(User.createStrategy()); // This line uses the passport.use() method to add a new authentication strategy to Passport. In this case, the strategy is created using the createStrategy() method provided by the passport-local-mongoose plugin. This strategy allows the app to authenticate users with username and password credentials using the User model.


passport.serializeUser((user, done) => {//serializeUser() method is called when a user is authenticated, and it is used to convert the user object to a unique identifier. This identifier is then stored in the session object, which allows the app to keep track of the authenticated user across multiple requests.
  done(null, user.id);
});

passport.deserializeUser(function(id, done) { //deserializeUser() method is called when the app needs to access the user data in the session, and it is used to convert the identifier back into the user object.
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

app.get("/auth/google", //This route handler is for the GET method and the /auth/google URL. It uses the passport.authenticate() method to initiate the Google OAuth 2.0 authentication process. This method will redirect the user to the Google login page, where they can grant the app access to their Google profile.
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

app.get("/secrets", function(req, res){ //This route handler is for the GET method and the /secrets URL. It uses the User.find() method to query the database for users who have a non-null value for the secret field. It then renders the secrets template, passing the array of users as a parameter.
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

app.post('/submit',function(req,res){ //This route handler is for the POST method and the /submit URL. It is called when the user submits the form on the /submit page. The handler retrieves the secret from the request body using the req.body property, and then uses the User.findById() method to find the user in the database. It updates the user's secret and saves the changes to the database, and then redirects the user to the /secrets page.
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


app.post('/register',function(req,res){ //This route handler is for the POST method and the /register URL. It is called when the user submits the form on the /register page. The handler uses the User.register() method provided by the passport-local-mongoose plugin to register a new user with the given username and password. It then uses the passport.authenticate() method to log the user in and redirect them to the /secrets page.
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

app.post('/login',function(req,res){// This route handler is for the POST method and the /login URL. It is called when the user submits the form on the /login page. The handler creates a new user object with the given username and password, and then uses the req.login() method provided by Passport to log the user in. It then redirects the user to the /secrets page.
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
