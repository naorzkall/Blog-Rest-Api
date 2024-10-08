const { validationResult} = require('express-validator')
const bcrypt =  require('bcryptjs');
const jwt = require('jsonwebtoken');



const User = require('../models/User');


exports.signup = (req,res,next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error =  new Error('Validation failed')
        error.statusCode = 422;
        // throw the errors array
        error.data =  errors.array();
        throw error;
    }

    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    bcrypt.hash(password, 12)
        .then(hashed => {
            const user =new User({
                email: email,
                name: name,
                password: hashed
            })
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'User Created.',
                userId : result._id
            })
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.login = (req,res,next)=>{
    const email =  req.body.email;
    const password =  req.body.password;
    let loadeduser;

    User.findOne({email: email })
        .then(user => {
            if(!user){
                const error =  new Error('A user can not be found');
                error.statusCode = 401;
                throw error;
            }
            loadeduser = user;
            return bcrypt.compare(password, user.password);
        })
        .then(isEqual => {
            if (!isEqual){
                const error = new Error('wrong password');
                error.statusCode = 404;
                throw error;
            }
            /*   generate a new token
               - jwt.sign() method creates a new signature and packs that into a new json web token
               - we can add any info we want into the token like (email,userId ....etc)
               - should not store the raw password, beacuse that would be returned to the frontend (not ideal)
               - second argument is the secret => the (private key) which used signing
                    and that is now only known to the server, and therefore you can't fake that token on the client side
               - for secret ypu want to use a longer string
               - third argument is the expired time (the token become invalid after that time)
                    now this is a mechanism you should add beacuse the token is stored in the client
                    technically, that token could be stolen, so after the time expires will not be able to use it
               
            */
            const token = jwt.sign({
                email: loadeduser.email,
                userId: loadeduser._id.toString()
            },
            'somesupersecretsecret',
            { expiresIn: '1h'}
            );
            res.status(200).json({
                token : token,
                // in react app I will looking for that id
                userId : loadeduser._id.toString()
            })

        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            next();
        })
}