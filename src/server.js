if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')

const utils = require('./utils/validation');
const { body, validationResult} = require('express-validator');
const { check } = require('express-validator');

const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const users = require('../database/User.json');
const jwt = require('jsonwebtoken')
const newspapers = require('../database/newspapers.json');
//Define the dunction that push newspapers's (id,website,source) to jornales array
const jornales= []//array of newspapers (id,website,source)
const articles = []//array of news (id,title,url,newspaperId,source)


//--- IMPORTE ROUTES
const v3newsRoute = require('./api/v3/routes/News')
const v3newspapersRoute = require('./api/v3/routes/Newspapers')
//--- Middlewares
app.use('/api/v3/news', v3newsRoute);
app.use('/api/v3/newspapers/', v3newspapersRoute);//v3newspapersRoute
app.use(express.json());


//------------------------------------------------------ PASSPORT -----------------------------------------------------------


// calling the validation function that takes user.email & user.id
const initializePassport = require('./passport-config')
const { use } = require('chai')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)
// adding ejs so the system can acces the data enterd in the ejs forms to red
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({// PROBLEM
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


//------------------------------------------------------ FUNCTIONS -----------------------------------------------------------

//-- check if user is Authenticated
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}
//-- check if user is Authenticated
function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}
//-- get (id,name,website) of newspapers
newspapers.forEach(newspaper => {
  //Pushing the titles and the url in the array articles    
  jornales.push({id:newspaper.id, name: newspaper.name, website:newspaper.website})
  });
//-- scrap the news
let count=1;//counter of newsID
//Function of getting data about climate change and then putting it in the articles array
newspapers.forEach(newspaper => {
    //Using Axios to get data from the news publication
    axios.get(newspaper.address)
    .then((response) => {//Creating the respons that we apear in the feed
        const html = response.data //saving the response
        const $ = cheerio.load(html) //pickup element
        //Search for anything that talks about the climate change
            $('a:contains("climate")', html).each(function (){
                //Grabing the text in the A tag
                const title = $(this).text()//Picking the text
                const url = $(this).attr('href')//Picking the Url
                articles.push({id:count,title, url:newspaper.base + url, newspaperId:newspaper.id, source: newspaper.name})//Pushing the titles and the url in the array articles
                count++;
            })               
})
}) 

//------------------------------------------------------ ROUTES -----------------------------------------------------------

//------------------------------------------------------- HOME ------------------------------------------------------------

// HOME , first check if he's authenticated, if yes redricet to index.ejs else go to login
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name })
})
app.get('/contact', checkAuthenticated, (req, res) => {
  res.render('Contact.ejs', { name: req.user.name })
})
// Login , first check if he is not authenticated, if he isn't auth then redirect to login.ejs, else to index.ejs
app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})
// log user in,
// first check if he is not authenticated, if he isn't auth then redirect to login.ejs, else to index.ejs
// Second validate his username&password with passport, if exsit => home, else =>login 
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))
// Signin , first check if he is not authenticated, if he isn't auth then redirect to register.ejs, else to index.ejs
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})
// register user in,
// first check if he is not authenticated, if he isn't auth then redirect to login.ejs, else to index.ejs
// Second push the entered info&hasedp to db and =>login, else =>register
app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    ///////////
    const user = {
      id: users.length+1,
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    }
    //
    console.log(user);

    let new_user = {
    ...user,
    "id":users.length + 1
    }
    console.log(new_user);
    let new_users = [
    ...users,
    new_user
    ]
    let data = JSON.stringify(new_users);

    fs.writeFile('../database/User.json', data, (err) => {
    if (err) throw err;
    console.log('Data written to file');
    });

//users.push(user);
    console.log('User Created');
    res.render('/')
    } catch {
    res.redirect('/')
    }
})

// loginout with buttun in index.ejs
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

// login with buttun in rejester.ejs
app.delete('/login', (req, res) => {
  req.logOut()
  res.redirect('/register')
})


//----------------------------------------------------- NEWSPAPERS ----------------------------------------------------------

//Get all newspapers (id,website,source) ---- DONE
app.get('/newspapers',checkAuthenticated, (req, res, next) => {
     //Display the articles
    console.log('request: GET /newspapers')             
     res.status(200).json(jornales)
     console.log('auth')
 });
 
 //Get newspapers (id,website,source) by id ---- DONE
app.get('/newspapers/:newspapersId',checkAuthenticated, (req,res) => {
     //Display the newspapers
     const newspaperId = req.params.newspapersId;
     console.log('request: GET /newspapers/'+newspaperId+'') 
     const newspaper = newspapers.find(newspaper => newspaper.id === parseInt(newspaperId));
     if(!newspaper) return res.status(404).send("The newspaper with the provided ID does not exist.");
     res.status(200).json(jornales[newspaperId-1])     
 });

 //--- POSTES   ---- DONE?

app.post('/',
 //---- Validation Using express-validator
 //---- Sanitization
 check('name').isLength({ min: 5 }).withMessage('must be at least 5 chars long').toLowerCase().trim().not().isEmpty().trim().escape(),
 check('website').isURL().withMessage('its not a url').isLength({ min: 5 }).withMessage('must be at least 5 chars long'),
 check('address').isURL().withMessage('its not a url').isLength({ min: 5 }).withMessage('must be at least 5 chars long'),
 check('base').isURL().withMessage('its not a url ').isLength({ min: 5 }).withMessage('must be at least 5 chars long'),
 
 (req, res) => {
   // Finds the validation errors in this request and wraps them in an object with handy functions
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
     return res.status(400).send(errors);
   }
   const newspaper = {
     id: newspapers.length + 1,
     name: req.body.name,
     website: req.body.website,
     address: req.body.address,
     base: req.body.base    
     };
 
     newspapers.push(newspaper);
     console.log('request: POST /newspapers {'+req.body.name+','+req.body.website+','+req.body.address+','+req.body.base+'}')
     res.status(200).json(newspaper)
     //res.status(200).send(newspaper);
 });
 
 //--- PUTS (MODIFY) ---- DONE
 
 app.put("/:id",(request, response) => {
   const taskId = request.params.id;
   const task = newspapers.find(task => task.id === parseInt(taskId));
   if(!task) return response.status(404).send("The task with the provided ID does not exist.");
   //---- Validation Using Joi-validation
   const { error } = utils.validateTask(request.body);
   if(error) return response.status(400).send(error);
 
   task.name = request.body.name,//set the name of the parking to the name that the client insert in the req body
   task.website = request.body.website,//
   task.address = request.body.address,//
   task.base = request.body.base,//
 
   response.send(task);
 });
 
 //--- DELETE ---- DONE
 
 app.delete("/:newspapersId", (request, response) => {
   const taskId = request.params.id;
   const task = newspapers.find(task => task.id === parseInt(taskId));
   //if(!task) return response.status(404).send("The newspaper with the provided ID does not exist.");
 
   const index = newspapers.indexOf(task);
   newspapers.splice(index, 1);
   response.send(task);
  
 });


//-------------------------------------------------------- NEWS -------------------------------------------------------------

app.get('/news', (req,res) => {
  //Display the articles
  console.log('request: GET /news') 
  res.status(200).json(articles)    
});
//Get news (newsId,title,url,newspaperId,source) by id DONE
app.get('/news/:newsId', (req,res) => {
  //Display the articles
  const newsId = req.params.newsId;
  console.log('request: GET /news/'+newsId+'') 
  const news = articles.find(news => news.id === parseInt(newsId));
  if(!news) return res.status(404).send("The news with the provided ID does not exist.");
  res.status(200).json(articles[newsId-1])//-1 because it start with 0 rathen 1   

});


app.listen(3000)