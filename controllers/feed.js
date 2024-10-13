const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/User');

exports.getPosts = async (req, res, next) => {
    /*  
        -json() is an express function allow us to return a response with json data with right header and so on
        -we can pass a normal js object to json() and it will be converted to json and sent back to the client who send the request
        -sending a json response, and the clinet will take it as a json and render it based on the error code also 
    */
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try{
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt:-1})
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems
        });
    }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
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
    //create post
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
      });
    try{
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        // before send a response, I wanna inform other users using scoket.io using my io object
        io.getIO().emit( 'posts' , { action:'create', post:{...post._doc,creator:{_id:req.userId, name: user.name }} })

        res.status(201).json({
          message: 'Post created successfully!',
          post: post,
          creator: { _id: user._id, name: user.name }
        });
    }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
    }
};

exports.getPost = async(req,res,next)=>{
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    try {
        if (!post) {
          const error = new Error('Could not find post.');
          error.statusCode = 404;
          throw error;
        }
        res.status(200).json({ message: 'Post fetched.', post: post });
      } catch (err) {
        if (!err.statusCode) {
          err.statusCode = 500;
        }
        next(err);
      }
}

exports.updatePost = async (req,res,next)=>{
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
    try{
        const post = await Post.findById(postId).populate('creator');
        if(!post){
            const error  = new Error('Could not find post.');
            error.statusCode = 404;
            throw error;
        }
        // check if the user edit a post belong to him
        if(post.creator._id.toString() !== req.userId){
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
        const result = await post.save();

        io.getIO().emit('posts',{action:'update',post:result })

        res.status(200).json({ message: 'Post updated!', post: result });
    }catch(err){
        if (!err.statusCode) {
            err.statusCode = 500;
          }
          next(err);
    }
}

exports.deletePost = async(req,res,next)=>{
    const postId = req.params.postId;
    try{
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find post.');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw error;
        }
        // check login user
        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(postId);

        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();
    
        io.getIO().emit('posts',{action:'delete',post: postId});

        res.status(200).json({ message: 'Deleted post.' });
    }catch(err){
        if (!err.statusCode) {
        err.statusCode = 500;
        }
        next(err);
    }
}

const clearImage = filePath => {
    // '..' to up one foleder because we are not on the root folder, we are the controller folder
    filePath = path.join(__dirname,'..' ,filePath);
    fs.unlink(filePath, err => {console.log(err);});
};
