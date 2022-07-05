//jshint esversion:6
require('dotenv').config(); // THIS WILL ALLOW ME TO HIDE MY ENCRYTION KEY and other shit in file outside of this one
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt"); // use this for even stronger encryption with hashing and salting rounds
const saltRounds = 10; // there will be 2^10 rounds of salting the hash.


const port = 3000;

const app = express();

console.log(process.env.SECRET); //this will log the secret shit that's in the .env file

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect("mongodb://localhost:27017/userDB");



// /////////////////////////////////Schema for encrypted email/password authentication
var userSchema = new mongoose.Schema({
    email: String,
    password: String
    // whatever else
});


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

// Register with even stronger encryption using salting of hashes
app.post("/register",function(req, res){

  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {  //bcrypt salting code

    const newUser = new User ({
      email: req.body.username,
      password: hash //peep the hash
    });

    newUser.save(function(err){
      if (err){
        console.log(err);
      }else{
        res.render("secrets");
      }
    });
  });


});


/////////////////////////////////////////login to app with email and password
app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password; // peep the hashing

  User.findOne({email: username}, function(err, foundUser){
    if (err){
      console.log(err);
    }else{
      if (foundUser){
        bcrypt.compare(password, foundUser.password, function(err, result) {  //bcrypt salting shit
          if (result === true){
            res.render("secrets");
          }
        });
      }
    }
  });
});




app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
