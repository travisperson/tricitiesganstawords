
;(function() {
    var WAITING_FOR_PLAYER   = 0x01
      , GAME_OVER            = 0x02
      , GAME_PLAYING         = 0x03

    var game = this
      , socket = io.connect()
      , hud
      , usedWords
      , playersList
      , modal

      game.attackWords  = {}
      game.usedWords    = {}
      game.playerId     = null
      game.playerName   = null
      game.playing      = true
      game.players      = null
      game.room         = null
      game.state        = null
      game.session      = document.URL.split('#!')[1] || null
   

    $(document).ready(function () {
      players_list$   = $('#players')
      used_words$     = $('#used-words')
      modal$          = $('#modal')
      hud$            = $('#hud')

      function handleUsed(str, id) {
        game.usedWords[str] = id
        used_words$.prepend('<li>'+str+'</li>')
      }

      function joinSession(session) {
        console.log('Joining Session... ['+session+']')
        socket.emit('join_session', session)
      }

      socket.on('session_full', function (boolean) {
        console.log('Session Full')
        setTimeout(function () {
           joinSession(game.session)
        }, 5 * 1000) // 5 Seconds
      })

      socket.on('session_id', function (session) { 
        console.log('Joined Session! ['+session+']')
        var url = ''

        if(window.location.hostname)
          url += window.location.hostname
        if(window.location.port)
          url += ':' + window.location.port
        
        url += '/#!' + session

        $('#session-url-input').attr('value', url)

        $('#session-url-input').on('click', function () {
          $(this).focus();
          $(this).select();
        })
      })

      socket.on('attack', function(str, id) {
        if (!game.state == GAME_PLAYING) return
        str = str.toLowerCase().trim()
        handleUsed(str, id)
        game.exports.incomingWord(str, (id === game.playerId))
      })

      socket.on('block', function(str, id) {
        if (!game.state == GAME_PLAYING) return
        str = str.toLowerCase().trim()
        game.exports.destroyWord(str, (id === game.playerId))
      })

      socket.on('state', function (state) {
        switch(state) {
          case GAME_PLAYING:
            console.log('Game Playing')
            game.start()
            break;
          case GAME_OVER:
            console.log('Game Over')
            game.over()
            break;
          case WAITING_FOR_PLAYER:
            console.log('Waiting for player...')
            break;
          default:
            console.log('Unknown Game state ['+state+']')
            break;
        }
        
      })

      $(window).on('keypress', function(e) {
        if (e.keyCode === 13) hud$.fadeOut()
      })

      game.attack = function(str, fn) {
        str = str.toLowerCase().trim()
        console.log('Attack: ['+str+']')
        socket.emit('attack', str, function(err) {
          if (err) {
            hud$.html(err).fadeIn()
          }
          fn && fn(err)
        })
      }

      game.over = function() {
        modal$
          .fadeIn()
          .queue(function(n) { $(this).html('Game Over'); n() })
          .delay(1500)
      }

      game.start = function() {
        used_words$.empty()
        console.log(typeof game.exports.resetGame)
        game.exports.resetGame()

        modal$
          .fadeIn()
          .queue(function(n) { $(this).html('Starting Game...'); n() })
          .delay(2000)
          .queue(function(n) { $(this).html('5'); n() })
          .delay(1000)
          .queue(function(n) { $(this).html('4'); n() })
          .delay(1000)
          .queue(function(n) { $(this).html('3'); n() })
          .delay(1000)
          .queue(function(n) { $(this).html('2'); n() })
          .delay(1000)
          .queue(function(n) { $(this).html('1'); n() })
          .delay(1000)
          .queue(function(n) { $(this).html('Start!'); n() })
          .fadeOut(function() {
            $(this).html('')
          })
      }

      window.exports = typeof exports !== 'undefined' ? exports : {}

      $(document).unbind('keypress');

      $(document).keypress(function (e) {
         if ( e.target.nodeName.toUpperCase() != 'TEXTAREA' ) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if ( code == 8 ) return false;
         }
      });
      var w = $('#holder').width()
        , h = $('#holder').height()
        , defaultSpeed = 5 
        , wbottom = h - 72
        , rbottom = h - 33
        , rtop = h + 10
        , verticalSpacing = 30
      


      $(window).resize(function(){
           w = $('#holder').width()
           h = $('#holder').height()
           paper.setSize(w,h)
      })
      var paper = Raphael('holder', w,h)

      var youWords = {'bottomHeight': verticalSpacing
        , 'columnLocation': w/4
        , 'words': {}}
      var themWords = {'bottomHeight': verticalSpacing
        , 'columnLocation': w*3/4
        , 'words': {}}

      var drop = function(t, fromBottom) {
        t.finalDest = wbottom-fromBottom
        var bounceDest = t.finalDest 
        console.log('bounce is ' + bounceDest)
        t.animate({y: bounceDest+3}, ((bounceDest+3-t.attrs.y)*defaultSpeed), function() {
          if (bounceDest === t.finalDest) {
            console.log('bounce up')
            t.animate({y: bounceDest-6}, ((t.attrs.y-bounceDest+6)*defaultSpeed*2), function() {
              if (bounceDest === t.finalDest) {
                console.log('bounce down')
                t.animate({y: bounceDest}, ((bounceDest-t.attrs.y)*defaultSpeed*2))
              }
            })
          }
        })
      }

      function reStackWords(wordList) {
        wordList.bottomHeight = verticalSpacing
        Object.keys(wordList.words).forEach(function(word) {
          drop(wordList.words[word], wordList.bottomHeight)
          wordList.bottomHeight += verticalSpacing
        })
      }

      exports.destroyWord = function(destroyWord, isMe) {
        destroyWord = destroyWord.toLowerCase()
        if (isMe) {
          if (!youWords.words[destroyWord]) return
          youWords.words[destroyWord].attr({'text': ''})
          delete youWords.words[destroyWord]
          reStackWords(youWords)
        }
        else {
          if (!themWords.words[destroyWord]) return
          themWords.words[destroyWord].attr({'text': ''})
          delete themWords.words[destroyWord]
          reStackWords(themWords)
        }
      }

      exports.incomingWord = function(attackWord, isMe) {
        attackWord = attackWord.toLowerCase()
        console.log('Incoming word received ' + attackText + ' for ' + isMe ? 'me' : 'them')
        var attackText = paper.text(isMe 
            ? themWords.columnLocation 
            : youWords.columnLocation, 30, attackWord)

        attackText.attr({'font-size': 16}).toFront()

        if (!isMe) {
          attackText.node.setAttribute('class', 'word you')
          youWords.words[attackWord] = attackText 
          drop(attackText, youWords.bottomHeight)
          youWords.bottomHeight += verticalSpacing
        }
        else {
          attackText.node.setAttribute('class', 'word them')
          themWords.words[attackWord] = attackText
          drop(attackText, themWords.bottomHeight)
          themWords.bottomHeight += verticalSpacing
        }
        //$(attackText.node).lettering();
      }

      var spacer = 1
      var resetSpacer
      var currentWord = ''
      var text = paper.text(w/2, rbottom, currentWord)
      text.node.setAttribute('class', 'word input')

      var hightlightMatches = function (targetWord) {
        Object.keys(youWords.words).forEach(function(word) {
          if (word.substring(0, targetWord.length) === targetWord) {
            console.log('found match on ' + word)
            $(youWords.words[word].node).children().css('fill', 'red');
          }
          else {
            $(youWords.words[word].node).children().css('fill', 'white');
          }
        })
      }

      var resetHighlights = function (targetWord) {
        Object.keys(youWords.words).forEach(function(word) {
          $(youWords.words[word].node).children().css('fill', 'white');
        })
      }

      exports.resetGame = function() {
        Object.keys(youWords.words).forEach(function(word) {
          exports.destroyWord(word, true)
        })
        Object.keys(themWords.words).forEach(function(word) {
          exports.destroyWord(word, false)
        })
      } 

      function addLetter(letter) {
        currentWord += letter
        spacer =currentWord.length
        text.attr({'text': currentWord}).toFront()
        hightlightMatches(currentWord)
      }

      function deleteLetter() {
        currentWord = currentWord.substring(0, currentWord.length - 1)
        spacer = currentWord.length
        text.attr({'text': currentWord}).toBack()
      }

      function resetWord() {
        currentWord = ''
        text.attr({'text': ''}).toBack()
        spacer = 1
        resetHighlights()
      }

      document.onkeydown = function(ev) {
        
        if ( ev.keyCode === 8 ) { 
          ev.keyCode = 0
          ev.returnValue = false
          deleteLetter() 
          return false
        }
      }

      //Handle keystrokes to get new words
      document.onkeypress = function(ev) {
        
        if (ev.keyCode === 13 || ev.keyCode === 32) {
          attack(currentWord, function(err) {
            resetWord()
          })
        }
        else {
          if(ev.keyCode === 8)
            return
          var letter = String.fromCharCode(ev.charCode)
          addLetter(letter)
        }
      }

      joinSession(game.session)

    })

    socket.on('ready', function (data) {
      console.log('Ready!')
      game.playerId = socket.socket.sessionid
    })

    // $(document).on('click', function () {
    //   socket.emit('win', true)
    // })
})()

// Client to server connector
// ==========================

// ;(function() {

//   var root = this
//     , socket = io.connect()
//     , hud
//     , usedWords
//     , playersList
//     , modal
  
//   root.attackWords = {}
//   root.usedWords = {}
//   root.playerId = null
//   root.playerName = null
//   root.playing = true
//   root.players = null
//   root.room = null

//   // Socket listeners
//   // ----------------

//   console.log('socket', socket.socket)

//   $(function() {

//     usedWords = $('#used-words')
//     hud = $('#hud')
//     playersList = $('#players')
//     modal = $('#modal')

//     function handleUsed(str, id) {
//       root.usedWords[str] = id
//       usedWords.prepend('<li>'+str+'</li>')
//     }

//     socket.on('connect', function() {
//       root.playerId = socket.socket.sessionid
//       root.room = prompt('Room name?')
//       root.room = root.room.toLowerCase().replace(' ','')

//       socket.emit('room', root.room)

//       socket.on('used', function(words) {
//         if (!words) return
//         Object.keys(words).forEach(function(str) {
//           usedWords.prepend('<li>'+str.toUpperCase()+'</li>')
//         })
//       })

//       socket.on('players', function(people) {
//         if (!people) return
//         root.players = people;
//         playersList.empty()
//         Object.keys(people).forEach(function(person) {
//           playersList.append('<li id="p-'+person+'">'+people[person].name+'</li>')
//         })
//       })

//       // Actions
//       // -------

//       socket.on('attack', function(str, id) {
//         if (!root.playing) return
//         str = str.toLowerCase().trim()
//         handleUsed(str, id)
//         root.exports.incomingWord(str, (id === root.playerId))
//       })

//       socket.on('block', function(str, id) {
//         if (!root.playing) return
//         str = str.toLowerCase().trim()
//         root.exports.destroyWord(str, (id === root.playerId))
//       })

//       // Win conditions
//       // --------------

//       socket.on('lose', function(id) {
//         console.log('lose', id)
//         playersList.find('#p-'+id).addClass('lost')

//         if (id === root.playerId) {
//           youLost()
//         }
//       })

//       socket.on('win', function(id) {
//         console.log('win', id)
//         winGame(id)
//       })

//       socket.on('start', function() {
//         console.log('start game')
//         startGame()
//       })

//       socket.on('gameOver', function() {
//         gameOver()
//       })

//       // UI
//       // --

//       $(window).bind('keypress', function(e) {
//         if (e.keyCode === 13) hud.fadeOut()
//       })
//     })

//     // Attacking
//     // ---------

//     function attack(str, fn) {
//       str = str.toLowerCase().trim()
//       socket.emit('attack', str, function(err) {
//         if (err) {
//           hud.html(err).fadeIn()
//         }
//         fn && fn(err)
//       })
//     }

//     function youLost() {
//       modal
//         .fadeIn()
//         .queue(function(n) { $(this).html('You Lost!'); n() })
//         .delay(1500)
      
//       root.playing = false
//     }

//     function gameOver() {
//       modal
//         .fadeIn()
//         .queue(function(n) { $(this).html('Game Over'); n() })
//         .delay(1500)

//       root.playing = false
//     }

//     function startGame() {
//       usedWords.empty()
//       exports.resetGame()

//       modal
//         .fadeIn()
//         .queue(function(n) { $(this).html('Starting Game...'); n() })
//         .delay(2000)
//         .queue(function(n) { $(this).html('5'); n() })
//         .delay(1000)
//         .queue(function(n) { $(this).html('4'); n() })
//         .delay(1000)
//         .queue(function(n) { $(this).html('3'); n() })
//         .delay(1000)
//         .queue(function(n) { $(this).html('2'); n() })
//         .delay(1000)
//         .queue(function(n) { $(this).html('1'); n() })
//         .delay(1000)
//         .queue(function(n) { $(this).html('Start!'); n() })
//         .fadeOut(function() {
//           root.playing = true
//           $(this).html('')
//         })
//     }

//     function winGame(id) {
//       usedWords.empty()
//       exports.resetGame()
//       root.playing = false

//       modal
//         .fadeIn()
//         .queue(function(n) { $(this).html('Game Over'); n() })
//         .delay(1500)
//         .queue(function(n) { $(this).html(players[id].name+' Won!'); n() })
//         .delay(1500)
//     }

//     // Exports
//     // -------

//     root.attack = attack
//     root.startGame = startGame
//   })

// })()

;(function() {

  // Font family definitions to be loaded, this should 
  // be trimmed to only the families used in production
  WebFontConfig = {
    google : {
      families : [
        'Shadows+Into+Light'
      ]
    }
  }

  // Add the Google script to the page to allow for the 
  // webfont declarations to be loaded
  var wf = document.createElement('script')
    , s = document.getElementsByTagName('script')[0]

  wf.src = '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js'
  wf.type = 'text/javascript'
  wf.async = 'true'
  s.parentNode.insertBefore(wf, s)

})()
