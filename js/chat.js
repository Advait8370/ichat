import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)

const messages = $('messages')
const input = $('messageInput')
const sendBtn = $('sendBtn')
const fileInput = $('fileInput')
const searchInput = $('searchInput')
const searchResults = $('searchResults')
const recentChats = $('recentChats')
const logoutBtn = $('logoutBtn')
const chatName = $('chatName')
const profilePic = $('profilePic')
const myUsername = $('myUsername')
const groupNameInput = $('groupNameInput')
const createGroupBtn = $('createGroupBtn')
const groupInviteInput = $('groupInviteInput')
const addUserToGroupBtn = $('addUserToGroupBtn')
const groupList = $('groupList')
const storyInput = $('storyInput')
const storiesList = $('storiesList')
const storyViewer = $('storyViewer')
const storyImage = $('storyImage')
const storyTextBox = $('storyTextBox')
const textStoryBtn = $('textStoryBtn')
const voiceBtn = $('voiceBtn')
const typingText = $('typingText')
const replyPreview = $('replyPreview')
const replyText = $('replyText')
const cancelReplyBtn = $('cancelReplyBtn')

const audioCallBtn = $('audioCallBtn')
const videoCallBtn = $('videoCallBtn')
const incomingCallModal = $('incomingCallModal')
const incomingCallTitle = $('incomingCallTitle')
const incomingCallText = $('incomingCallText')
const acceptCallBtn = $('acceptCallBtn')
const rejectCallBtn = $('rejectCallBtn')
const callModal = $('callModal')
const localVideo = $('localVideo')
const remoteVideo = $('remoteVideo')
const muteBtn = $('muteBtn')
const cameraBtn = $('cameraBtn')
const endCallBtn = $('endCallBtn')

const profileModal = $('profileModal')
const settingsModal = $('settingsModal')
const editUsername = $('editUsername')
const editBio = $('editBio')
const editAvatarFile = $('editAvatarFile')
const saveProfileBtn = $('saveProfileBtn')
const darkModeToggle = $('darkModeToggle')
const notifyToggle = $('notifyToggle')
const deleteAccountBtn = $('deleteAccountBtn')

let currentChatUser = null
let currentGroup = null
let mode = 'dm'
let myProfile = null
let mediaRecorder = null
let audioChunks = []
let typingTimer = null
let replyToMessage = null

let peer = null
let localStream = null
let activeCall = null
let isMuted = false
let cameraOff = false

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

const { data: { user } } = await supabase.auth.getUser()
if (!user) location.href = 'login.html'

await loadMyProfile()
loadRecentChats()
loadGroups()
loadStories()
requestNotificationPermission()

async function loadMyProfile() {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('uid', user.id)
    .maybeSingle()

  if (data) {
    myProfile = data
    myUsername.innerText = '@' + data.username
    profilePic.src = data.avatar || 'assets/logo.png'
    editUsername.value = data.username || ''
    editBio.value = data.bio || ''
    darkModeToggle.checked = data.dark_mode !== false
    notifyToggle.checked = data.notifications !== false
    document.body.classList.toggle('light', data.dark_mode === false)

    await supabase.from('users').update({
      online: true,
      last_seen: new Date().toISOString()
    }).eq('uid', user.id)

    return
  }

  const username = 'user_' + Math.floor(Math.random() * 999999)

  await supabase.from('users').insert([{
    uid: user.id,
    username,
    email: user.email,
    avatar: '',
    bio: '',
    online: true,
    notifications: true,
    dark_mode: true
  }])

  await loadMyProfile()
}

logoutBtn.onclick = async () => {
  await supabase.from('users').update({
    online: false,
    last_seen: new Date().toISOString()
  }).eq('uid', user.id)

  await supabase.auth.signOut()
  location.href = 'login.html'
}

window.openProfileModal = () => {
  profileModal.style.display = 'grid'
}

window.closeProfileModal = () => {
  profileModal.style.display = 'none'
}

window.openSettingsModal = () => {
  settingsModal.style.display = 'grid'
}

window.closeSettingsModal = () => {
  settingsModal.style.display = 'none'
}

saveProfileBtn.onclick = async () => {
  const username = editUsername.value.trim().toLowerCase()
  const bio = editBio.value.trim()
  let avatar = myProfile.avatar || ''

  if (!username) return alert('Username required')

  if (editAvatarFile.files[0]) {
    const uploaded = await uploadFile(editAvatarFile.files[0], 'uploads')
    if (uploaded) avatar = uploaded
  }

  const { error } = await supabase.from('users').update({
    username,
    bio,
    avatar
  }).eq('uid', user.id)

  if (error) return alert(error.message)

  await loadMyProfile()
  closeProfileModal()
}

darkModeToggle.onchange = async () => {
  const dark = darkModeToggle.checked
  document.body.classList.toggle('light', !dark)

  await supabase.from('users').update({
    dark_mode: dark
  }).eq('uid', user.id)
}

notifyToggle.onchange = async () => {
  await supabase.from('users').update({
    notifications: notifyToggle.checked
  }).eq('uid', user.id)
}

deleteAccountBtn.onclick = async () => {
  if (!confirm('Delete your iChat account?')) return

  await supabase.from('users').delete().eq('uid', user.id)
  await supabase.auth.signOut()
  location.href = 'register.html'
}

async function loadRecentChats() {
  const sent = await supabase
    .from('private_chats')
    .select('*')
    .eq('sender_id', user.id)

  const received = await supabase
    .from('private_chats')
    .select('*')
    .eq('receiver_id', user.id)

  const all = [
    ...(sent.data || []),
    ...(received.data || [])
  ]

  const chatMap = new Map()

  all.forEach(msg => {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    if (!otherId || otherId === user.id) return

    const old = chatMap.get(otherId)

    if (!old || new Date(msg.created_at) > new Date(old.created_at)) {
      chatMap.set(otherId, msg)
    }
  })

  const sortedChats = [...chatMap.entries()]
    .sort((a, b) => new Date(b[1].created_at) - new Date(a[1].created_at))

  recentChats.innerHTML = ''

  for (const [otherId, msg] of sortedChats) {
    const { data: other } = await supabase
      .from('users')
      .select('*')
      .eq('uid', otherId)
      .maybeSingle()

    if (!other) continue

    const { data: unread } = await supabase
      .from('private_chats')
      .select('id')
      .eq('sender_id', otherId)
      .eq('receiver_id', user.id)
      .eq('seen', false)

    const div = document.createElement('div')
    div.className = 'chat-item'

    div.innerHTML = `
      <img src="${other.avatar || 'assets/logo.png'}">
      <div class="chat-meta">
        <b>@${escapeHtml(other.username)}</b>
        <small>${escapeHtml(previewMessage(msg))}</small>
      </div>
      ${unread && unread.length ? `<span class="unread">${unread.length}</span>` : ''}
    `

    div.onclick = () => openDM(other)
    recentChats.appendChild(div)
  }
}

function previewMessage(msg) {
  if (msg.deleted_for_everyone) return 'This message was deleted'
  if (msg.type === 'image') return '📷 Photo'
  if (msg.type === 'voice') return '🎤 Voice message'
  return msg.text || ''
}

searchInput.addEventListener('input', async () => {
  const value = searchInput.value.trim()

  if (!value) {
    searchResults.innerHTML = ''
    recentChats.style.display = 'block'
    return
  }

  recentChats.style.display = 'none'

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${value}%`)

  if (error) return console.log(error)

  searchResults.innerHTML = ''

  data.forEach(u => {
    if (u.uid === user.id) return

    const div = document.createElement('div')
    div.className = 'user-result'

    div.innerHTML = `
      <img src="${u.avatar || 'assets/logo.png'}" style="width:48px;height:48px;border-radius:50%;object-fit:cover">
      <div>
        <b>@${escapeHtml(u.username)}</b><br>
        <small>${u.online ? 'online' : lastSeenText(u.last_seen)}</small>
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
  typingText.innerText = u.online ? 'online' : lastSeenText(u.last_seen)
  loadMessages()
}

createGroupBtn.onclick = async () => {
  const name = groupNameInput.value.trim()
  if (!name) return

  const { data, error } = await supabase
    .from('groups')
    .insert([{ name, created_by: user.id }])
    .select()
    .single()

  if (error) return alert(error.message)

  await supabase.from('group_members').insert([{
    group_id: data.id,
    uid: user.id,
    role: 'admin'
  }])

  groupNameInput.value = ''
  loadGroups()
}

async function loadGroups() {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('uid', user.id)

  if (error) return console.log(error)

  groupList.innerHTML = ''

  ;(data || []).forEach(row => {
    const g = row.groups
    if (!g) return

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
  typingText.innerText = 'Group chat'
  loadMessages()
}

addUserToGroupBtn.onclick = async () => {
  if (!currentGroup) return alert('Open/select a group first')

  const username = groupInviteInput.value.trim().toLowerCase()
  if (!username) return alert('Enter username')

  const { data: target, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) return alert(error.message)
  if (!target) return alert('User not found')

  const exists = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', currentGroup.id)
    .eq('uid', target.uid)
    .maybeSingle()

  if (exists.data) return alert('User already in group')

  const insert = await supabase.from('group_members').insert([{
    group_id: currentGroup.id,
    uid: target.uid,
    role: 'member'
  }])

  if (insert.error) return alert(insert.error.message)

  groupInviteInput.value = ''
  alert('User added to group')
}

sendBtn.onclick = sendMessage

input.addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage()
})

input.addEventListener('input', async () => {
  if (mode !== 'dm' || !currentChatUser) return

  await setTyping(true)

  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => setTyping(false), 1200)
})

cancelReplyBtn.onclick = () => {
  replyToMessage = null
  replyPreview.style.display = 'none'
  replyText.innerText = ''
}

async function setTyping(isTyping) {
  if (!currentChatUser) return

  await supabase.from('typing_status').upsert([{
    sender_id: user.id,
    receiver_id: currentChatUser.uid,
    typing: isTyping,
    updated_at: new Date().toISOString()
  }], {
    onConflict: 'sender_id,receiver_id'
  })
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text) return

  input.value = ''
  await setTyping(false)

  const replyId = replyToMessage ? replyToMessage.id : null
  replyToMessage = null
  replyPreview.style.display = 'none'

  if (mode === 'dm' && currentChatUser) {
    const { error } = await supabase.from('private_chats').insert([{
      sender_id: user.id,
      receiver_id: currentChatUser.uid,
      text,
      type: 'text',
      reply_to: replyId
    }])

    if (error) alert(error.message)
  }

  if (mode === 'group' && currentGroup) {
    const { error } = await supabase.from('group_messages').insert([{
      group_id: currentGroup.id,
      sender_id: user.id,
      text,
      type: 'text',
      reply_to: replyId
    }])

    if (error) alert(error.message)
  }

  loadMessages()
  loadRecentChats()
}

async function loadMessages() {
  messages.innerHTML = ''
  let all = []

  if (mode === 'dm' && currentChatUser) {
    const first = await supabase
      .from('private_chats')
      .select('*')
      .match({ sender_id: user.id, receiver_id: currentChatUser.uid })

    const second = await supabase
      .from('private_chats')
      .select('*')
      .match({ sender_id: currentChatUser.uid, receiver_id: user.id })

    if (first.error || second.error) return console.log(first.error || second.error)

    all = [...(first.data || []), ...(second.data || [])]

    await supabase
      .from('private_chats')
      .update({ seen: true })
      .eq('sender_id', currentChatUser.uid)
      .eq('receiver_id', user.id)
  }

  else if (mode === 'group' && currentGroup) {
    const res = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', currentGroup.id)

    if (res.error) return console.log(res.error)

    all = res.data || []
  }

  else {
    messages.innerHTML = '<div class="empty-chat">Search user or open group to start chatting.</div>'
    return
  }

  all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  if (all.length === 0) {
    messages.innerHTML = '<div class="empty-chat">No messages yet.</div>'
    return
  }

  for (const msg of all) {
    const deleted = await isDeletedForMe(msg.id)
    if (deleted) continue
    await renderMessage(msg, all)
  }

  messages.scrollTop = messages.scrollHeight
}

async function renderMessage(msg, allMessages) {
  const div = document.createElement('div')

  div.classList.add(
    'message',
    msg.sender_id === user.id ? 'sent' : 'received'
  )

  if (msg.deleted_for_everyone) {
    div.innerHTML = `<i>This message was deleted</i><span class="msg-time">${formatTime(msg.created_at)}</span>`
    messages.appendChild(div)
    return
  }

  let replyHtml = ''
  if (msg.reply_to) {
    const original = allMessages.find(m => m.id === msg.reply_to)
    if (original) {
      replyHtml = `<div class="reply-box">${escapeHtml(original.text || previewMessage(original))}</div>`
    }
  }

  if (msg.type === 'image') {
    if (!msg.image || msg.image === 'null') return
    div.innerHTML = `${replyHtml}<img src="${msg.image}">`
  }

  else if (msg.type === 'voice') {
    if (!msg.audio || msg.audio === 'null') return
    div.innerHTML = `${replyHtml}<audio controls src="${msg.audio}"></audio>`
  }

  else {
    div.innerHTML = `${replyHtml}${escapeHtml(msg.text || '')}${msg.edited ? ' <small>(edited)</small>' : ''}`
  }

  const reactions = await getReactions(msg.id)

  div.innerHTML += `
    <div class="reactions">${reactions}</div>
    <span class="msg-time">${formatTime(msg.created_at)}</span>
    <div class="msg-actions">
      <button onclick="replyMessage(${msg.id})">Reply</button>
      ${msg.sender_id === user.id && msg.type === 'text' ? `<button onclick="editMessage(${msg.id})">Edit</button>` : ''}
      <button onclick="deleteForMe(${msg.id})">Delete me</button>
      ${msg.sender_id === user.id ? `<button onclick="deleteForEveryone(${msg.id})">Delete all</button>` : ''}
      <button onclick="reactMessage(${msg.id}, '❤️')">❤️</button>
      <button onclick="reactMessage(${msg.id}, '😂')">😂</button>
      <button onclick="reactMessage(${msg.id}, '👍')">👍</button>
      <button onclick="reactMessage(${msg.id}, '😮')">😮</button>
      <button onclick="reactMessage(${msg.id}, '😢')">😢</button>
      ${msg.sender_id === user.id && mode === 'dm' ? `<span class="tick">${msg.seen ? '✓✓' : '✓'}</span>` : ''}
    </div>
  `

  messages.appendChild(div)
}

async function isDeletedForMe(messageId) {
  const { data } = await supabase
    .from('deleted_messages')
    .select('id')
    .eq('message_id', messageId)
    .eq('uid', user.id)
    .eq('chat_type', mode)
    .maybeSingle()

  return !!data
}

async function getReactions(messageId) {
  const { data } = await supabase
    .from('message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('chat_type', mode)

  return (data || []).map(r => r.emoji).join(' ')
}

window.replyMessage = async messageId => {
  const table = mode === 'dm' ? 'private_chats' : 'group_messages'

  const { data } = await supabase
    .from(table)
    .select('*')
    .eq('id', messageId)
    .maybeSingle()

  if (!data) return

  replyToMessage = data
  replyText.innerText = data.text || previewMessage(data)
  replyPreview.style.display = 'flex'
}

window.reactMessage = async (messageId, emoji) => {
  await supabase.from('message_reactions').insert([{
    message_id: messageId,
    uid: user.id,
    emoji,
    chat_type: mode
  }])

  loadMessages()
}

window.deleteForMe = async messageId => {
  await supabase.from('deleted_messages').insert([{
    message_id: messageId,
    uid: user.id,
    chat_type: mode
  }])

  loadMessages()
}

window.deleteForEveryone = async messageId => {
  const table = mode === 'dm' ? 'private_chats' : 'group_messages'

  await supabase.from(table).update({
    deleted_for_everyone: true,
    text: '',
    image: '',
    audio: ''
  }).eq('id', messageId)

  loadMessages()
  loadRecentChats()
}

window.editMessage = async messageId => {
  const newText = prompt('Edit message')
  if (!newText) return

  const table = mode === 'dm' ? 'private_chats' : 'group_messages'

  await supabase.from(table).update({
    text: newText,
    edited: true
  }).eq('id', messageId)

  loadMessages()
  loadRecentChats()
}

fileInput.onchange = async () => {
  const file = fileInput.files[0]
  if (!file) return

  const url = await uploadFile(file, 'uploads')
  if (!url) return

  if (mode === 'dm' && currentChatUser) {
    await supabase.from('private_chats').insert([{
      sender_id: user.id,
      receiver_id: currentChatUser.uid,
      type: 'image',
      image: url,
      reply_to: replyToMessage ? replyToMessage.id : null
    }])
  }

  if (mode === 'group' && currentGroup) {
    await supabase.from('group_messages').insert([{
      group_id: currentGroup.id,
      sender_id: user.id,
      type: 'image',
      image: url,
      reply_to: replyToMessage ? replyToMessage.id : null
    }])
  }

  replyToMessage = null
  replyPreview.style.display = 'none'

  loadMessages()
  loadRecentChats()
}

voiceBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    voiceBtn.innerHTML = '<i class="fa fa-microphone"></i>'
    return
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  mediaRecorder = new MediaRecorder(stream)
  audioChunks = []

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data)

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    const file = new File([blob], 'voice.webm', { type: 'audio/webm' })

    const url = await uploadFile(file, 'uploads')
    if (!url) return

    if (mode === 'dm' && currentChatUser) {
      await supabase.from('private_chats').insert([{
        sender_id: user.id,
        receiver_id: currentChatUser.uid,
        type: 'voice',
        audio: url,
        reply_to: replyToMessage ? replyToMessage.id : null
      }])
    }

    if (mode === 'group' && currentGroup) {
      await supabase.from('group_messages').insert([{
        group_id: currentGroup.id,
        sender_id: user.id,
        type: 'voice',
        audio: url,
        reply_to: replyToMessage ? replyToMessage.id : null
      }])
    }

    replyToMessage = null
    replyPreview.style.display = 'none'

    loadMessages()
    loadRecentChats()
  }

  mediaRecorder.start()
  voiceBtn.innerHTML = '<i class="fa fa-stop"></i>'
}

storyInput.onchange = async () => {
  const file = storyInput.files[0]
  if (!file) return

  const url = await uploadFile(file, 'uploads')
  if (!url) return

  await supabase.from('stories').insert([{
    uid: user.id,
    image: url,
    text: '',
    expires_at: new Date(Date.now() + 86400000).toISOString()
  }])

  loadStories()
}

textStoryBtn.onclick = async () => {
  const text = prompt('Enter text status')
  if (!text) return

  await supabase.from('stories').insert([{
    uid: user.id,
    text,
    image: '',
    bg: '#00a884',
    expires_at: new Date(Date.now() + 86400000).toISOString()
  }])

  loadStories()
}

async function loadStories() {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  storiesList.innerHTML = ''

  ;(data || []).forEach(s => {
    if ((!s.image || s.image === 'null') && !s.text) return

    const div = document.createElement('div')
    div.className = 'story-bubble'

    if (s.image) {
      div.innerHTML = `<img src="${s.image}">`
    } else {
      div.innerHTML = 'T'
    }

    div.onclick = () => {
      storyImage.style.display = 'none'
      storyTextBox.style.display = 'none'

      if (s.image) {
        storyImage.src = s.image
        storyImage.style.display = 'block'
      } else {
        storyTextBox.innerText = s.text
        storyTextBox.style.background = s.bg || '#00a884'
        storyTextBox.style.display = 'block'
      }

      storyViewer.style.display = 'grid'
    }

    storiesList.appendChild(div)
  })
}

window.closeStoryViewer = () => {
  storyViewer.style.display = 'none'
  storyImage.src = ''
  storyTextBox.innerText = ''
}

audioCallBtn.onclick = () => startCall('audio')
videoCallBtn.onclick = () => startCall('video')

async function startCall(type) {
  if (!currentChatUser) return alert('Select a user first. Calls work only in private chat.')

  activeCall = {
    caller_id: user.id,
    receiver_id: currentChatUser.uid,
    type,
    status: 'ringing'
  }

  await setupPeer(type)

  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)

  const { data, error } = await supabase.from('calls').insert([{
    caller_id: user.id,
    receiver_id: currentChatUser.uid,
    type,
    status: 'ringing',
    offer
  }]).select().single()

  if (error) return alert(error.message)

  activeCall = data
  callModal.style.display = 'grid'
}

async function setupPeer(type) {
  peer = new RTCPeerConnection(rtcConfig)

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video'
  })

  localVideo.srcObject = localStream

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream)
  })

  peer.ontrack = event => {
    remoteVideo.srcObject = event.streams[0]
  }

  peer.onicecandidate = async event => {
    if (!event.candidate || !activeCall?.id) return

    const { data } = await supabase
      .from('calls')
      .select('ice')
      .eq('id', activeCall.id)
      .maybeSingle()

    const oldIce = data?.ice || []

    await supabase
      .from('calls')
      .update({
        ice: [...oldIce, event.candidate.toJSON()]
      })
      .eq('id', activeCall.id)
  }
}

async function handleIncomingCall(call) {
  if (call.receiver_id !== user.id || call.status !== 'ringing') return

  activeCall = call
  incomingCallTitle.innerText = call.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'
  incomingCallText.innerText = 'Incoming call...'
  incomingCallModal.style.display = 'grid'
}

acceptCallBtn.onclick = async () => {
  if (!activeCall) return

  incomingCallModal.style.display = 'none'
  callModal.style.display = 'grid'

  await setupPeer(activeCall.type)

  await peer.setRemoteDescription(new RTCSessionDescription(activeCall.offer))

  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)

  await supabase.from('calls').update({
    status: 'accepted',
    answer
  }).eq('id', activeCall.id)
}

rejectCallBtn.onclick = async () => {
  if (!activeCall) return

  await supabase.from('calls').update({
    status: 'rejected'
  }).eq('id', activeCall.id)

  incomingCallModal.style.display = 'none'
  activeCall = null
}

endCallBtn.onclick = endCall

async function endCall() {
  if (activeCall?.id) {
    await supabase.from('calls').update({
      status: 'ended'
    }).eq('id', activeCall.id)
  }

  closeCallUI()
}

function closeCallUI() {
  callModal.style.display = 'none'
  incomingCallModal.style.display = 'none'

  if (peer) {
    peer.close()
    peer = null
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop())
    localStream = null
  }

  localVideo.srcObject = null
  remoteVideo.srcObject = null
  activeCall = null
  isMuted = false
  cameraOff = false
}

muteBtn.onclick = () => {
  if (!localStream) return

  isMuted = !isMuted

  localStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted
  })

  muteBtn.innerHTML = isMuted
    ? '<i class="fa fa-microphone-slash"></i>'
    : '<i class="fa fa-microphone"></i>'
}

cameraBtn.onclick = () => {
  if (!localStream) return

  cameraOff = !cameraOff

  localStream.getVideoTracks().forEach(track => {
    track.enabled = !cameraOff
  })

  cameraBtn.innerHTML = cameraOff
    ? '<i class="fa fa-video-slash"></i>'
    : '<i class="fa fa-video"></i>'
}

async function handleCallUpdate(call) {
  if (!activeCall || call.id !== activeCall.id) return

  if (call.status === 'accepted' && call.answer && user.id === call.caller_id) {
    await peer.setRemoteDescription(new RTCSessionDescription(call.answer))
  }

  if (call.ice && peer) {
    for (const c of call.ice) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(c))
      } catch {}
    }
  }

  if (['ended', 'rejected'].includes(call.status)) {
    closeCallUI()
  }
}

async function uploadFile(file, bucket) {
  if (!file) return null

  const ext = file.name.split('.').pop().toLowerCase()
  const safeName = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(safeName, file, {
    cacheControl: '3600',
    upsert: false
  })

  if (error) {
    console.log(error)
    alert(error.message)
    return null
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(safeName)

  return data.publicUrl || null
}

supabase
  .channel('ichat-v5')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'private_chats' }, payload => {
    if (payload.eventType === 'INSERT' && payload.new.receiver_id === user.id) {
      showNotification('New message', payload.new.text || previewMessage(payload.new))
    }

    if (mode === 'dm') loadMessages()
    loadRecentChats()
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, () => {
    if (mode === 'group') loadMessages()
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, loadMessages)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_messages' }, loadMessages)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, loadGroups)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, loadGroups)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, loadStories)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, payload => {
    const call = payload.new

    if (call.receiver_id === user.id && call.status === 'ringing') {
      handleIncomingCall(call)
    }

    handleCallUpdate(call)
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status' }, payload => {
    const t = payload.new

    if (
      mode === 'dm' &&
      currentChatUser &&
      t.sender_id === currentChatUser.uid &&
      t.receiver_id === user.id
    ) {
      typingText.innerText = t.typing
        ? 'typing...'
        : currentChatUser.online
          ? 'online'
          : lastSeenText(currentChatUser.last_seen)
    }
  })
  .subscribe(status => console.log('Realtime:', status))

window.addEventListener('beforeunload', async () => {
  await supabase.from('users').update({
    online: false,
    last_seen: new Date().toISOString()
  }).eq('uid', user.id)
})

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showNotification(title, body) {
  if (!myProfile?.notifications) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  new Notification(title, {
    body,
    icon: 'assets/logo.png'
  })
}

function escapeHtml(text = '') {
  const div = document.createElement('div')
  div.innerText = text
  return div.innerHTML
}

function lastSeenText(date) {
  if (!date) return 'offline'

  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)

  if (diff < 60) return 'last seen just now'
  if (diff < 3600) return `last seen ${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `last seen ${Math.floor(diff / 3600)} hours ago`

  return 'last seen ' + new Date(date).toLocaleDateString()
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}