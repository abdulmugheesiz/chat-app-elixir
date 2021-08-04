import {Socket, Presence} from "phoenix"

let socket = new Socket("/socket", {params: {token: window.userToken}})

let roomid = window.roomid
let presences = {}

socket.connect()

if (roomid) {
  const timeout = 3000
  var typingTimer
  let userTyping = false

  let channel = socket.channel(`room:${roomid}`, {})
  channel.join()
    .receive("ok", resp => { 
      console.log("Joined successfully", resp)
      resp.messages.reverse().map(msg => displayMessage(msg)) 
    })
    .receive("error", resp => { console.log("Unable to join", resp) })
  
  channel.on(`room:${roomid}:new_message`, (message) => {
    console.log(message)
    displayMessage(message)
  })
  
  channel.on("presence_state", state => {
    presences = Presence.syncState(presences, state)
    displayUsers(presences)
  })

  channel.on("presence_diff", diff => {
    presences = Presence.syncDiff(presences, diff)
    displayUsers(presences)
  })

  document.querySelector('#message-form').addEventListener('submit', (e) => {
    e.preventDefault()
    let input = e.target.querySelector('#message-body')
    
    channel.push('message:add', {message: input.value})
  
    input.value = ''
  })
  
  document.querySelector('#message-body').addEventListener('keydown', () => {
    userStartsTyping()
    clearTimeout(typingTimer)
  })

  document.querySelector('#message-body').addEventListener('keyup', () => {
    clearTimeout(typingTimer)
    typingTimer = setTimeout(userStopsTyping, timeout)
  })

  const userStartsTyping = () => {
    if (userTyping) {
      return
    }

    userTyping = true
    channel.push('user:typing', {
      typing: true
    })
  }

  const userStopsTyping = () => {
    clearTimeout(typingTimer)
    userTyping = false

    channel.push('user:typing', {
      typing: false
    })
  }

  const displayMessage = (msg) => {
    let template = `
      <li class='list-group-item'>
      <strong>${msg.user.username}</strong>:
      ${msg.body}</li>
    `
  
    document.querySelector('#display').innerHTML += template
  }

  const displayUsers = (presences) => {
    let usersOnline = Presence.list(presences, (_id, {
      metas: [
        user, ... rest
      ]
    }) => {
      var typingTemplate = ''
      if (user.typing) {
        typingTemplate = '<i>(Typing...)</i>'
      }
      return `
        <div id="user-${user.user_id}">
          <strong class="text-secondary">
            ${user.username}
          </strong>
          ${typingTemplate}
        </div> 
      `
    }).join("")
    document.querySelector("#users-online").innerHTML = usersOnline
  }
}


export default socket
