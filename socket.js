let io;

module.exports = {
    init: httpServer => {
        io = require('socket.io')(httpServer, {
            cors: {
              origin: "*", 
              methods: ["GET", "POST","PUT","PATCH","DELETE"] 
            }
        });
        return io;
    },
    getIO: ()=>{
        if(!io){
            throw new Error('Socket.io not initialized!')
        }
        return io;
    }
}