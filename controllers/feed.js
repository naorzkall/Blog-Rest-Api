const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/User');

exports.getPosts = (req, res, next) => {
    /*  
        -json() is an express function allow us to return a response with json data with right header and so on
        -we can pass a normal js object to json() and it will be converted to json and sent back to the client who send the request
        -sending a json response, and the clinet will take it as a json and render it based on the error code also 
    */
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find()
        .countDocuments()
        .then(count => {
        totalItems = count;
        return Post.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage);
        })
        .then(posts => {
        res
            .status(200)
            .json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems
            });
        })
        .catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
        });
};

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, enterd data is incorrect.');
        // adding my own custom property (you can named whatever you want)
        error.statusCode = 422;
        /* -throw an error
                it will automatically exit the function execution here 
                and instead will try to reach the next error handling mildware
                provided by our express application
         */
        throw error;
    }
    if(!req.file){
        const error = new Error('No image provided.');
        error.statusCode = 404;
        throw error
    }
    /*
        once there no error that mean that multure was able to extract a valid file,
        so you can access file.path which multer generates and which holds the path
        to the path to the file as it was stored on the server
    */
    const imageUrl = req.file.path.replace("\\" ,"/");
    const title = req.body.title;
    const content = req.body.content; 
    let creator;

    //create post
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
      });

    // save to mongodb
    post.save()
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user=>{
            creator = user;
            user.posts.push(post);
            return user.save();
        })
        .then(result=>{
            // 200 is just success, 201 is a code to tell the clinet that a resourse was created
            res.status(201).json({
                message: 'Post created successfully!',
                post: post,
                creator:{_id:creator._id,name:creator.name}
            });
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            /* 
                and we learned that since we inside a promise chain(asynch code snippet),
                throwing an error will not do the trick
                so we have to use next()
            */
            next();
        });
};

exports.getPost = (req,res,next)=>{
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if(!post){
                const error  = new Error('Could not find post.');
                error.statusCode = 404;
                /* - why we through an error if we are on Asynch code snnipt instead next()?
                        when we throw an error here the error will be passed as an error to the catch block 
                 */
                throw error;
            }
            res.status(200).json({message: 'Post fetched.',post : post})
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            next();
            
        });

}

exports.updatePost = (req,res,next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, enterd data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    // will hold the old url
    let imageUrl = req.body.image;
    // will hold the uploaded file if the user upload
    if(req.file){
        imageUrl = req.file.path.replace("\\" ,"/");
    }
    if(!imageUrl){
        const error =  new Error('No file picked.');
        error.statusCode = 422;
        throw error;
    }
    Post.findById(postId)
        .then(post => {
            if(!post){
                const error  = new Error('Could not find post.');
                error.statusCode = 404;
                throw error;
            }
            // check if the user edit a post belong to him
            if(post.creator.toString() !== req.userId){
                const error = new Error('Not authorized!');
                error.statusCode=404;
                throw error;
            }
            if(imageUrl !== post.imageUrl){
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save();
        })
        .then(result => {
            res.status(200).json({message:'Post updated!', post: result })
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            next();
        });

}

exports.deletePost = (req,res,next)=>{
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if(!post){
                const error  = new Error('Could not find post.');
                error.statusCode = 404;
                throw error;
            }
            // check if the user delete a post belong to him
            if(post.creator.toString() !== req.userId){
                const error = new Error('Not authorized!');
                error.statusCode=404;
                throw error;
            }
            // check login user
            clearImage(post.imageUrl);
            return Post.findByIdAndDelete(postId);
        })
        .then(result => {
            // console.log(result);
            res.status(200).json({
                message: 'Delete post done.'
            })
        })
        .catch(err => {
            if(!err.statusCode){
                err.statusCode = 500;
            }
            next();
        });

}

const clearImage = filePath => {
    // '..' to up one foleder because we are not on the root folder, we are the controller folder
    filePath = path.join(__dirname,'..' ,filePath);
    fs.unlink(filePath, err => {console.log(err);});
};
