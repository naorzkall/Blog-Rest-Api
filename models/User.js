const mongoose =  require('mongoose');
const Schema = mongoose.Schema;

const userSchema =  new Schema({
    email:{
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    name: {
        type: String,
        require: true
    },
    status:{
        type: String,
        default: 'I am new'
    },
    /* 
        posts is an array of post object, so each object in the array
        will be of type Schema.Types.ObjectId
        because this will be a refermce to a post
        therefore we add also a ref key with 'Post' model value
        that mean we store a references to posts in the user data
    */
    posts: [{
        type: Schema.Types.ObjectId,
        ref:'Post'

    }]
});

module.exports = mongoose.model('User', userSchema);
