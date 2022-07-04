//jshint esversion:6
require('dotenv').config(); // THIS WILL ALLOW ME TO HIDE MY ENCRYTION KEY and other shit in file outside of this one
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require ('mongoose-encryption');
const port = 3000;

const app = express();

console.log(process.env.SECRET); //this will log the secret shit that's in the .env file

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect("mongodb://localhost:27017/userDB");





//////////////////////////////////Schema for encrypted email/password authentication
var userSchema = new mongoose.Schema({
    email: String,
    password: String
    // whatever else
});



// THIS ENCRYPTS THE DATABASE using the SECRET encryption key in the .env file and the password above
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });







//////////////////////////////CREATE MODEL

const User = new mongoose.model("User", userSchema);



app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});


/////////////////////////////////////////signup for app with email and password
app.post("/register",function(req, res){
  const newUser = new User ({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if (err){
      console.log(err);
    }else{
      res.render("secrets");
    }
  });
});


/////////////////////////////////////////login to app with email and password
app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, foundUser){
    if (err){
      console.log(err);
    }else{
      if (foundUser){
        if (foundUser.password === password){
          res.render("secrets");
        }
      }
    }
  });
});




app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
