//jshint esversion:6
require('dotenv').config(); // THIS WILL ALLOW ME TO HIDE MY ENCRYTION KEY and other shit in file outside of this one
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');// peep the session requirement
const passport = require ("passport"); // peep the passport requirement
const passportLocalMongoose = require("passport-local-mongoose"); // peep the passpot local mongoose requirement
//passport-local doesn't need to be required here because we'll never refer to it in the code and plus it already comes inside of passport local mongoose ?
const GoogleStrategy = require('passport-google-oauth20').Strategy; //this is for google authentication
const findOrCreate = require("mongoose-findorcreate");



const port = 3000;

const app = express();

console.log(process.env.SECRET); //this will log the secret shit that's in the .env file

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


//Tell the app to use the express-session package from above (IMPORTANT: PUT THIS HERE!!!!![above mongoose connect and below the app.use shit])
//Documentation--> https://www.npmjs.com/package/express-session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

//Tell the app to use the passport package to initialize the passport package and to also use passport to deal with the session
//Documentation--> https://www.npmjs.com/package/passport
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB");



// /////////////////////////////////Schema for encrypted email/password authentication
var userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String //this line was added in order for a user who logged in with google to show up in the database
    // whatever else
});



//Use this to hash and salt the passwords and to save the users into the mongodb database
userSchema.plugin(passportLocalMongoose);

//Add this plugin to be able to use the findOrCreate package
userSchema.plugin(findOrCreate);


//////////////////////////////CREATE MODEL
const User = new mongoose.model("User", userSchema);




//create a strategy to authenticate users using their username and password and to seralize and deserialize the users
//This will work for all strategies. Not just local
//Documentation --> https://www.passportjs.org/tutorials/google/session/
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});



///////////////////////////Google auth login code. IMPORTANT!!!!! Place below the serial and deserialization code and the app.use(session) shit
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, //Comes from the CLIENT_ID on the .env page
    clientSecret: process.env.CLIENT_SECRET, // comes from the CLIENT_SECRET on the .env page
    callbackURL: "http://localhost:3000/auth/google/secrets" //comes from the redirect URI we set when setting up the OAuth shit
  },

  //this is where google sends back an access token which allows to get data from the user which allows us to acces the user's data for a longer period of time
  //this also gives us their profile which contains their email, google id, and anything else we have access to
  //lastly, we use the data we get back (the google id) to either find a use with that id in our database or create them.
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);//this will log EVERYTHING about that user's google profile identity, including their ID which will be needed
    //The function "findOrCreate" doesn't actually exist. It's seudo code to represent what should be happening. What's actully happening can be seen here https://stackoverflow.com/questions/20431049/what-is-function-user-findorcreate-doing-and-when-is-it-called-in-passport
    //To turn it into an actual function, you have to download a package called mongoose-findorcreate
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
  res.render("home");
});


//GET request to the path for the google login buttons
app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }) // This basically says to use passport to authenticate the user with google's super secure strategy, which is above in the GoogleStategy code. When we hit up google, we'er gonna tell them what we want is the user's profile, which is their email and user id on google. this comes from https://www.passportjs.org/packages/passport-google-oauth20/
);


//The user gets sent to this GET route after attempting to login with their google accout
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }), //this happens if authentication fails
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });


app.get("/login", function(req, res){
  res.render("login");
});


app.get("/register", function(req, res){
  res.render("register");
});


//Check to see if user is authenticated (logged in) before showing the logged in version of the website
app.get("/secrets", function (req,res){
  if (req.isAuthenticated()){ //if the user is logged in...
    res.render("secrets");
  }else{ //if the user isn't logge in....
    res.redirect("/login");
  }
});




/////////////////////////////////////////signup for app with email and password

// Register with even stronger encryption using salting of hashes
app.post("/register",function(req, res){

  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){ // this authenticates the user and (creates a login session) using the local hashing and encryption methods
        res.redirect("/secrets");
      });
    }
  });
});


/////////////////////////////////////////login to app with email and password

app.post("/login", function(req, res){
  //check the DB to see if the username that was used to login exists in the DB
  User.findOne({username: req.body.username}, function(err, foundUser){
    //if username is found in the database, create an object called "user" that will store the username and password
    //that was used to login
    if(foundUser){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
      //use the "user" object that was just created to check against the username and password in the database
      //in this case below, "user" will either return a "false" boolean value if it doesn't match, or it will
      //return the user found in the database
      passport.authenticate("local", function(err, user){
        if(err){
          console.log(err);
        } else {
          //this is the "user" returned from the passport.authenticate callback, which will be either
          //a false boolean value if no it didn't match the username and password or
          //a the user that was found, which would make it a truthy statement
          if(user){
            //if true, then log the user in, else redirect to login page
            req.login(user, function(err){
            res.redirect("/secrets");
            });
          } else {
            res.redirect("/login");
          }
        }
      })(req, res);
    //if no username is found at all, redirect to login page.
    } else {
      //user does not exists
      res.redirect("/login");
    }
  });
});






///////////////////////////////////////logout app by deauthenticating user and ending the session
app.get("/logout", function (req, res){
  req.logout(function (err){
    if (err){
      console.log(err);
    }else{
      res.redirect("/");
    }
  });
});



//listen on port 3000?
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
