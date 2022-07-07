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
    password: String
    // whatever else
});



//Use this to hash and salt the passwords and to save the users into the mongodb database
userSchema.plugin(passportLocalMongoose);



//////////////////////////////CREATE MODEL
const User = new mongoose.model("User", userSchema);




//create a local strategy to authenticate users using their username and password and to seralize and deserialize the users
//Documentation --> https://www.npmjs.com/package/passport-local-mongoose
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get("/", function(req, res){
  res.render("home");
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
      passport.authenticate("local")(req, res, function(){ // this authenticates the user and (creates a login session)
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
