const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const {generateMessage, generateLocationMessage} = require('../public/js/utils/message')
const {addUser,removeUser,getUser,getUsersInRoom} = require('../public/js/utils/users')


const port = process.env.PORT || 3000
const app = express()

const server = http.createServer(app)
const io = socketio(server)
const Filter = require('bad-words')

const publicDir = path.join(__dirname,'../public')
app.use(express.static(publicDir))

io.on('connection',(socket)=>{
    console.log('New WebSocket Connection')

    socket.on('join',(options,callback)=>{

        const {error,user} = addUser( {id : socket.id,...options})

        if(error) {
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message',generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',user.username+' has joined!'))
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage',(msg,callback)=>{
        const user = getUser(socket.id)
        
        const filter = new Filter()
        if(filter.isProfane(msg)) {
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('message',generateMessage(user.username,msg))
        callback('Delivered!')
    })

    socket.on('disconnect',()=>{

        const user = removeUser(socket.id)
        if(user) {
            io.to(user.room).emit('message',generateMessage('Admin',user.username+' has left'))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
        
    })

    socket.on('sendLocation',(coords,callback)=>{

        const user = getUser(socket.id)
        const url = 'https://google.com/maps?q='+coords.latitude+','+coords.longitude
        //const clientLocation = 'Locaion: '+coords.latitude +','+ coords.longitude
        io.to(user.room).emit('sendURL',generateLocationMessage(user.username, url))
        callback()
    })
})

server.listen(port,()=>{
    console.log('Server is up on port '+port)

})