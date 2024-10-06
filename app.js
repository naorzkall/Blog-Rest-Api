const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req,file,cb)=>{
    cb(null, 'images');
  },
  filename: (req, file, cb)=>{
    const uniqueSuffix = crypto.randomUUID();
    cb(null,uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req,file, cb) => {
  if(
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ){
    cb(null, true);
  } else{
    cb(null, false);
  }
};



/* app.use(bodyParser.urlencoded()); that is for x-ww-form-urlencoded which is a default data that data
     has if sumbitted through a form post request 
*/
app.use(bodyParser.json()); // application/json
app.use(multer(
  {storage:fileStorage, fileFilter: fileFilter}).single('image')
);
app.use('/images',express.static(path.join(__dirname,'images')));



// setting headers to solve the CORS ERROR (cross origin resourse sharing)
app.use((req,res,next)=>{
    // we allow an origins to access our conent'data'
    // we can add specific domains by seprate them by comma
    res.setHeader('Access-Control-Allow-Origin','*')
    // we allow this origins to use specific http methos
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE');
    // the headers our client might set on thier requests
    // so the client can sent request with exta authoriztion data in the header and also define the content type of the request
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    next();
    
});


// GET /feed/posts
app.use('/feed',feedRoutes);
app.use('/auth',authRoutes);


app.use((error,req,res,next)=>{
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({message:message, data: data});
});


mongoose
  .connect(
    'mongodb://localhost:27017/RestApi'
  )
  .then(result => {
    console.log('connected to database');
    app.listen(8080);
  })
  .catch(err => console.log(err));
