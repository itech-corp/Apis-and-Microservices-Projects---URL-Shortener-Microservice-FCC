'use strict';

let express = require('express');
let mongo = require('mongodb');
let mongoose = require('mongoose');
let bodyParser = require('body-parser')
let cors = require('cors');
let dns = require('dns');

let app = express();

// Basic Configuration 
let port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
 mongoose.connect(process.env.MONGO_URI);

app.use(cors());

//** Mongoos part 

let Schema = mongoose.Schema;

//** Model 

let UrlSchema = new Schema({
  
  original_url:String,
  short_url:Number

})

let UrlStock = new mongoose.model("UrlStock",UrlSchema);


/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended:false}));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});
app.route("/api/shorturl/new").post(bodyParser.urlencoded({extended:false}),(req,res)=>{
    
    let url = req.body.url;
     let dnsLookup = new Promise((resolve, reject)=>{
       
    let result = url.replace(/(^\w+:|^)\/\//, "");
    dns.lookup(result, function(err, addresses, family) {
      if (err) reject(err);
      resolve(addresses);
    });
});
  
  dnsLookup
    .then(()=>{
  
      return checkIfExists(url);
  })
    .then((data)=>{
    
    if(data.status){
      
      return res.json({original_url:url,short_url:data.short_url});
    }  
    else {
      
      let short_url= getRandomInt();
      let newUrl = new UrlStock({original_url:url,short_url:short_url});
      return CreateAndSaveUrl(newUrl);
    }
  })
    .then((data)=>{
      
    res.json(data);
  });
  
  dnsLookup.catch((reason)=>{
    return res.json({error:"Invalid URL"});
  });
    
});
app.get("/api/shorturl/:shortUrl",(req,res)=>{

  let redirectPromise = redirectToOriginalUrl(req.params.shortUrl);
  redirectPromise.then((original_url)=>{
    return res.redirect(original_url);
  });
  
  redirectPromise.catch((reason)=>{
    
    return res.json({error:"Invalid URL"});
  });
  
});

let redirectToOriginalUrl = (shortUrl)=>{
  return new Promise((resolve,reject)=>{
    UrlStock.findOne({short_url:shortUrl},(err,data)=>{
      if(err||data==null) reject(err);
      else return resolve(data.original_url);
    });
  });
};

let checkIfExists = (url)=>{
  return new Promise((resolve,reject)=>{
    UrlStock.findOne({original_url:url},(err,data)=>{
      if(err||data==null) resolve({status:false});
      else return resolve({status:true,short_url:data.short_url});
    });
  });
};

let getRandomInt=()=> {
  let min=1,max=100000,num;
    min = Math.ceil(min);
    max = Math.floor(max);
    num = Math.floor(Math.random() * (max - min)) + min; 
 return num;
};


let CreateAndSaveUrl = (url)=>{
  return new Promise((resolve,reject)=>{
  url.save((err,data)=>{
    if(err) reject(err);
    else return resolve({original_url:data.original_url,short_url:data.short_url});
  });
  });
};

app.listen(port, function () {
  console.log('Node.js listening ...');
});