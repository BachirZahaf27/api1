const router = require('express').Router();
const utils = require('../../../utils/validation');
const newspapers = require('../../../../database/newspapers.json');
const users = require('../../../../database/User.json');//...../database/newspapers
const { body, validationResult} = require('express-validator');
const { check } = require('express-validator');

const jornales= []//array of newspapers (id,website,source)


////////////////
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const express = require('express')
const initializePassport = require('../../../passport-config')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
)
//router.set('view-engine', 'ejs')
router.use(express.urlencoded({ extended: false }))
router.use(flash())
router.use(session({// PROBLEM
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
router.use(passport.initialize())
router.use(passport.session())
router.use(methodOverride('_method'))


//---------------------------------------------- FUNCTIONS -----------------------------------------------------
//Define the dunction that push newspapers's (id,website,source) to jornales array
newspapers.forEach(newspaper => {
    //Pushing the titles and the url in the array articles    
    jornales.push({id:newspaper.id, name: newspaper.name, website:newspaper.website})
    });


//---------------------------------------------- ROUTES -------------------------------------------------------

//--- GETS

//Get all newspapers (id,website,source) ---- DONE
router.get('/',checkAuthenticated, (req, res, next) => {
 // if (req.isAuthenticated()) {
    //Display the articles
    
    console.log('request: GET /newspapers')             
    res.status(200).json(jornales)
    console.log('auth')
  //}
  //console.log('not auth')
  //res.redirect('/login')

});

//Get newspapers (id,website,source) by id ---- DONE
router.get('/:newspapersId', (req,res) => {
    //Display the newspapers
    const newspaperId = req.params.newspapersId;
    console.log('request: GET /newspapers/'+newspaperId+'') 
    const newspaper = newspapers.find(newspaper => newspaper.id === parseInt(newspaperId));
    if(!newspaper) return res.status(404).send("The newspaper with the provided ID does not exist.");
    res.status(200).json(jornales[newspaperId-1])
    
});



//--- POSTES   ---- DONE?

router.post('/',
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

router.put("/:id",(request, response) => {
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

router.delete("/:newspapersId", (request, response) => {
  const taskId = request.params.id;
  const task = newspapers.find(task => task.id === parseInt(taskId));
  //if(!task) return response.status(404).send("The newspaper with the provided ID does not exist.");

  const index = newspapers.indexOf(task);
  newspapers.splice(index, 1);
  response.send(task);
 
});




function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}


module.exports = router;