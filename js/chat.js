<<<<<<< HEAD
import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)

const messages = $('messages')
const input = $('messageInput')
const sendBtn = $('sendBtn')
const fileInput = $('fileInput')
const searchInput = $('searchInput')
const searchResults = $('searchResults')
const logoutBtn = $('logoutBtn')
const chatName = $('chatName')
const profilePic = $('profilePic')
const myUsername = $('myUsername')
const groupNameInput = $('groupNameInput')
const createGroupBtn = $('createGroupBtn')
const groupList = $('groupList')
const storyInput = $('storyInput')
const storiesList = $('storiesList')
const storyViewer = $('storyViewer')
const storyImage = $('storyImage')
const closeStory = $('closeStory')
const voiceBtn = $('voiceBtn')

let currentChatUser = null
let currentGroup = null
let mode = 'dm'
let mediaRecorder = null
let audioChunks = []

const {
  data: { user }
} = await supabase.auth.getUser()

if (!user) {
  location.href = 'login.html'
}

await loadMyProfile()
loadGroups()
loadStories()

async function loadMyProfile() {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('uid', user.id)
    .maybeSingle()

  if (data) {
    myUsername.innerText = '@' + data.username

    if (data.avatar) {
      profilePic.src = data.avatar
    }

    await supabase
      .from('users')
      .update({ online: true })
      .eq('uid', user.id)

    return
  }

  const username = 'user_' + Math.floor(Math.random() * 999999)

  await supabase
    .from('users')
    .insert([{
      uid: user.id,
      username,
      email: user.email,
      avatar: '',
      bio: '',
      online: true
    }])

  loadMyProfile()
}

window.addEventListener('beforeunload', async () => {
  await supabase
    .from('users')
    .update({
      online: false,
      last_seen: new Date().toISOString()
    })
    .eq('uid', user.id)
})

logoutBtn.onclick = async () => {
  await supabase
    .from('users')
    .update({
      online: false,
      last_seen: new Date().toISOString()
    })
    .eq('uid', user.id)

  await supabase.auth.signOut()

  location.href = 'login.html'
}

searchInput.addEventListener('input', async () => {
  const value = searchInput.value.trim()

  if (!value) {
    searchResults.innerHTML = ''
    return
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${value}%`)

  if (error) {
    console.log(error)
    return
  }

  searchResults.innerHTML = ''

  data.forEach(u => {
    if (u.uid === user.id) return

    const div = document.createElement('div')
    div.className = 'user-result'

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${u.avatar || 'assets/default.png'}"
        style="width:48px;height:48px;border-radius:50%;object-fit:cover">
        <div>
          <b>@${escapeHtml(u.username)}</b><br>
          <small>${u.online ? 'online' : 'offline'}</small>
        </div>
      </div>
    `

    div.onclick = () => openDM(u)

    searchResults.appendChild(div)
  })
})

function openDM(u) {
  mode = 'dm'
  currentChatUser = u
  currentGroup = null

  chatName.innerText = '@' + u.username

  loadMessages()
}

createGroupBtn.onclick = async () => {
  const name = groupNameInput.value.trim()

  if (!name) return

  const { data, error } = await supabase
    .from('groups')
    .insert([{
      name,
      created_by: user.id
    }])
    .select()
    .single()

  if (error) {
    alert(error.message)
    return
  }

  await supabase
    .from('group_members')
    .insert([{
      group_id: data.id,
      uid: user.id,
      role: 'admin'
    }])

  groupNameInput.value = ''

  loadGroups()
}

async function loadGroups() {
  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('uid', user.id)

  groupList.innerHTML = ''

  ;(data || []).forEach(row => {
    const g = row.groups

    const div = document.createElement('div')
    div.className = 'group-item'
    div.innerHTML = '👥 ' + escapeHtml(g.name)

    div.onclick = () => openGroup(g)

    groupList.appendChild(div)
  })
}

function openGroup(g) {
  mode = 'group'
  currentGroup = g
  currentChatUser = null

  chatName.innerText = '👥 ' + g.name

  loadMessages()
}

sendBtn.onclick = sendMessage

input.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    sendMessage()
  }
})

async function sendMessage() {
  const text = input.value.trim()

  if (!text) return

  input.value = ''

  if (mode === 'dm' && currentChatUser) {
    const { error } = await supabase
      .from('private_chats')
      .insert([{
        sender_id: user.id,
        receiver_id: currentChatUser.uid,
        text,
        type: 'text'
      }])

    if (error) alert(error.message)
  }

  if (mode === 'group' && currentGroup) {
    const { error } = await supabase
      .from('group_messages')
      .insert([{
        group_id: currentGroup.id,
        sender_id: user.id,
        text,
        type: 'text'
      }])

    if (error) alert(error.message)
  }

  loadMessages()
}

async function loadMessages() {
  messages.innerHTML = ''

  let all = []

  if (mode === 'dm' && currentChatUser) {
    const first = await supabase
      .from('private_chats')
      .select('*')
      .match({
        sender_id: user.id,
        receiver_id: currentChatUser.uid
      })

    const second = await supabase
      .from('private_chats')
      .select('*')
      .match({
        sender_id: currentChatUser.uid,
        receiver_id: user.id
      })

    if (first.error) {
      console.log(first.error)
      return
    }

    if (second.error) {
      console.log(second.error)
      return
    }

    all = [
      ...(first.data || []),
      ...(second.data || [])
    ]
  }

  else if (mode === 'group' && currentGroup) {
    const res = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', currentGroup.id)

    if (res.error) {
      console.log(res.error)
      return
    }

    all = res.data || []
  }

  else {
    messages.innerHTML = `
      <div class="empty-chat">
        Search user or open group to start chatting.
      </div>
    `
    return
  }

  all.sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  )

  if (all.length === 0) {
    messages.innerHTML = `
      <div class="empty-chat">
        No messages yet.
      </div>
    `
    return
  }

  all.forEach(msg => {
    const div = document.createElement('div')

    div.classList.add(
      'message',
      msg.sender_id === user.id ? 'sent' : 'received'
    )

    if (msg.type === 'image') {
      div.innerHTML = `<img src="${msg.image}">`
    }

    else if (msg.type === 'voice') {
      div.innerHTML = `<audio controls src="${msg.audio}"></audio>`
    }

    else {
      div.innerText = msg.text || ''
    }

    messages.appendChild(div)
  })

  messages.scrollTop = messages.scrollHeight
}

fileInput.onchange = async () => {
  const file = fileInput.files[0]

  if (!file) return

  const url = await uploadFile(file, 'uploads')

  if (!url) return

  if (mode === 'dm' && currentChatUser) {
    await supabase
      .from('private_chats')
      .insert([{
        sender_id: user.id,
        receiver_id: currentChatUser.uid,
        type: 'image',
        image: url
      }])
  }

  if (mode === 'group' && currentGroup) {
    await supabase
      .from('group_messages')
      .insert([{
        group_id: currentGroup.id,
        sender_id: user.id,
        type: 'image',
        image: url
      }])
  }

  loadMessages()
}

voiceBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    voiceBtn.innerHTML = '<i class="fa fa-microphone"></i>'
    return
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true
  })

  mediaRecorder = new MediaRecorder(stream)
  audioChunks = []

  mediaRecorder.ondataavailable = e => {
    audioChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, {
      type: 'audio/webm'
    })

    const file = new File(
      [blob],
      'voice_' + Date.now() + '.webm',
      { type: 'audio/webm' }
    )

    const url = await uploadFile(file, 'uploads')

    if (mode === 'dm' && currentChatUser) {
      await supabase
        .from('private_chats')
        .insert([{
          sender_id: user.id,
          receiver_id: currentChatUser.uid,
          type: 'voice',
          audio: url
        }])
    }

    if (mode === 'group' && currentGroup) {
      await supabase
        .from('group_messages')
        .insert([{
          group_id: currentGroup.id,
          sender_id: user.id,
          type: 'voice',
          audio: url
        }])
    }

    loadMessages()
  }

  mediaRecorder.start()

  voiceBtn.innerHTML = '<i class="fa fa-stop"></i>'
}

storyInput.onchange = async () => {
  const file = storyInput.files[0]

  if (!file) return

  const url = await uploadFile(file, 'uploads')

  await supabase
    .from('stories')
    .insert([{
      uid: user.id,
      image: url,
      expires_at: new Date(Date.now() + 86400000).toISOString()
    }])

  loadStories()
}

async function loadStories() {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', {
      ascending: false
    })

  storiesList.innerHTML = ''

  ;(data || []).forEach(s => {
    const div = document.createElement('div')

    div.className = 'story-bubble'

    div.innerHTML = `<img src="${s.image}">`

    div.onclick = () => {
      storyImage.src = s.image
      storyViewer.style.display = 'grid'
    }

    storiesList.appendChild(div)
  })
}

closeStory.onclick = () => {
  storyViewer.style.display = 'none'
}

async function uploadFile(file, bucket) {
  const ext = file.name.split('.').pop().toLowerCase()

  const safeName =
    crypto.randomUUID() + '.' + ext

  const upload = await supabase.storage
    .from(bucket)
    .upload(safeName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (upload.error) {
    alert(upload.error.message)
    console.log(upload.error)
    return null
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(safeName)

  return data.publicUrl
}

supabase
  .channel('ichat-v3')

  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'private_chats'
    },
    () => {
      if (mode === 'dm') loadMessages()
    }
  )

  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'group_messages'
    },
    () => {
      if (mode === 'group') loadMessages()
    }
  )

  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'groups'
    },
    loadGroups
  )

  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'stories'
    },
    loadStories
  )

  .subscribe(status => {
    console.log('Realtime:', status)
  })

function escapeHtml(text = '') {
  const div = document.createElement('div')
  div.innerText = text
  return div.innerHTML
=======
import { supabase }
from './supabase.js'

const messages =
document.getElementById(
  "messages"
)

const input =
document.getElementById(
  "messageInput"
)

const sendBtn =
document.getElementById(
  "sendBtn"
)

const fileInput =
document.getElementById(
  "fileInput"
)

sendBtn.onclick =
sendMessage

async function sendMessage(){

  if(input.value.trim() === "")
  return

  const {
    data:{ user }
  } =
  await supabase.auth.getUser()

  await supabase
  .from('messages')
  .insert([{

    uid:user.id,

    text:input.value,

    type:"text"

  }])

  input.value = ""

}

async function loadMessages(){

  const { data } =
  await supabase

  .from('messages')

  .select('*')

  .order('created_at')

  messages.innerHTML = ""

  data.forEach(msg=>{

    const div =
    document.createElement("div")

    div.classList.add("message")

    if(msg.type === "text"){

      div.innerHTML =
      msg.text

    }

    if(msg.type === "image"){

      div.innerHTML =
      `<img src="${msg.image}">`

    }

    messages.appendChild(div)

  })

}

loadMessages()

supabase
.channel('messages')

.on(
  'postgres_changes',
  {
    event:'INSERT',
    schema:'public',
    table:'messages'
  },

(payload)=>{

  loadMessages()

})

.subscribe()

fileInput.onchange =
async ()=>{

  const file =
  fileInput.files[0]

  const fileName =
  Date.now() + file.name

  const {
    error
  } =
  await supabase.storage

  .from('uploads')

  .upload(
    fileName,
    file
  )

  if(error){

    alert(error.message)
    return

  }

  const { data } =
  supabase.storage

  .from('uploads')

  .getPublicUrl(fileName)

  const {
    data:{ user }
  } =
  await supabase.auth.getUser()

  await supabase
  .from('messages')
  .insert([{

    uid:user.id,

    type:"image",

    image:data.publicUrl

  }])

>>>>>>> e5a925c5d6c1af47d36f118296cf2b3842f8ecc9
}