var socket  = require('socket.io')
var express = require('express')
var fs      = require('fs')
var uuid    = require('node-uuid')
var Dictionary = require('./dictionary')

exports.Wordattack = Wordattack = function () {
  this.app      = express.createServer()
  this.io       = socket.listen(this.app)
  this.public   = String(__dirname).split('/')
  this.sessions = {}
  this.users    = {}

  this.public.splice(this.public.length - 1, 1)
  this.public = this.public.join('/')
  this.public += '/public'
}

var WAITING_FOR_PLAYER   = 0x01
  , GAME_OVER            = 0x02
  , GAME_PLAYING         = 0x03


Wordattack.prototype.start = function (port) {
  self = this
  self.app.listen(port)
  self.app.use("/assets", express.static(this.public + '/assets'))

  self.app.get('/', function (req, res) {
    res.sendfile(self.public + '/index.html');
  });

  // Callback exicuted on a new connection
  self.io.sockets.on('connection', function (socket) {
    // Join session
    socket.on('join_session', function (session) {
      // Session is null or session doesnt exist
      if(!session || !self.sessions[session]) {
        // Sesion is not set
        session = session || uuid()

        self.sessions[session] = {
            players: {}
          , dictionary: new Dictionary
          , pcount: 0
          , state: null
          , playedWords: {}
        }
      }

      socket.emit('ready', true)

      // If we have already two players returned a failed join
      if( self.sessions[session].pcount == 2 )
        return socket.emit('session_full', true)

      self.sessions[session].pcount++                     // Increase player count
      self.sessions[session].players[socket.id] = {
          socket: socket  // Add player
        , words: []
      }

      socket.emit('session_id', session)

      self.users[socket.id] = session

      if( self.sessions[session].pcount == 2 ) {
        self.sessions[session].state = GAME_PLAYING
        self.sessions[session].dictionary = new Dictionary // Reset the dictionary
        return self.broadcast(session, 'state', GAME_PLAYING)
      }

      // Waiting for player
      socket.emit('state', WAITING_FOR_PLAYER)
      
      
    });

    socket.on('win', function (data) {
      var session = self.users[socket.id]
      var game    = self.sessions[session]
      
      game.state = GAME_OVER
      // Get the other user
      var player = null
      for( var _x in game.players )
        if(_x != socket.id)
          player = game.players[_x]

      player.socket.emit('loser')
      game.players[socket.id].emit('winner')

    })

    socket.on('attack', function (word, fn) {
      word = word.toUpperCase()
      var id = socket.id;
      var session = self.users[id]
      var game = self.sessions[session]

      if (game.dictionary.words.hasOwnProperty(word)) {
        
      
        // Its a real word
        if (game.players[id].words.hasOwnProperty(word)) {
          // 
          delete game.players[id].words[word];
          //io.sockets.emit('block', word, id)
          self.broadcast(session, 'block', word, id)
          fn(null)
        } else {
          if (!game.playedWords.hasOwnProperty(word)) {
            game.playedWords[word] = true;
            //io.sockets.emit('attack', word, id)
            self.broadcast(session, 'attack', word, id)

            Object.keys(game.players).forEach(function(_id) {
              if (id !== _id) {
                game.players[_id].words[word] = true;
              }
            })

            //game.players[id].words[word] = true
            fn(null)
          } else {
            fn('Word has been played')
          }
        }
      } else {
        fn('Not a valid word')
    

      }
      
    });
    

// if (game.dictionary.words.hasOwnProperty(word)) {
//   // Its a real word
//   if (game.playedWords.hasOwnProperty(word)) {
//     // Its been played
//     if (game.players[id].words.hasOwnProperty(word)) {
//       fn('Word has been played')
//     } else {
//       self.broadcast(session, 'block', word, id)
//     }
    
//   } else {
//     // Emit attack
//     self.broadcast(session, 'attack', word, id)
//   }
// } else {
//   fn('Not a valid word')
// }



    // User disconnected
    socket.on('disconnect', function () {
      // User discounnected
      var session = self.users[socket.id]
      var game = self.sessions[session]
      game.pcount--
      delete game.players[socket.id]
      
      if( game.pcount == 0 ) {
        // Delete the game
        return delete self.sessions[session]
      }

      if( game.state == GAME_OVER )
        return
      
      // Get the other user
      var player = null
      for( var _x in game.players )
        if(_x != socket.id)
          player = game.players[_x]
  
      game.state = GAME_OVER
      player.socket.emit('state', GAME_OVER)
      player.socket.emit('winner')
      player.socket.emit('state', WAITING_FOR_PLAYER
    )
    })
  });
}

// Broadcast to call clients connect to the channel
Wordattack.prototype.broadcast = function (session, event, data, id) {
  // Get the clients subscribed to the channel
  self = this
  var game = self.sessions[session]
  
  for( var _x in game.players )
    game.players[_x].socket.emit(event, data, id)

}