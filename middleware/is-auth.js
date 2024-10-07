const jwt = require('jsonwebtoken');

module.exports = (req,res,next)=>{
    const authToken = req.get('Authorization');
    if(!authToken){
        const error = new Error('Not authenticated');
        error.statusCode=401;
        throw error;
    }
    const token=authToken.split(' ')[1]; // "Bearer token"
    let decodedToken;
    try{
        decodedToken= jwt.verify(token,'somesupersecretsecret');

    }catch(err){
        err.statusCode=500;
        throw err;
    }
    // if decodedToken not defined
    if(!decodedToken){
        const error = new Error('Not authenticated');
        error.statusCode=401;
        throw error;
    }
    req.userId=decodedToken.userId;
    next();
};
