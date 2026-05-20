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
let mode = 'home'
let myProfile = null
let mediaRecorder = null
let audioChunks = []
let typingTimer = null

const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  location.href = 'login.html'
}

await loadMyProfile()
loadGroups()
loadStories()
showHomeScreen()

function showHomeScreen() {
  mode = 'home'
  currentChatUser = null
  currentGroup = null
  chatName.innerText = 'iChat'
  typingText.innerText = 'Select a chat to start messaging'

  messages.innerHTML = `
    <div class="wa-home">
      <div class="wa-laptop">
        <i class="fa fa-laptop"></i>
        <i class="fa fa-phone"></i>
      </div>

      <h1>Download iChat for Windows</h1>
      <p>Get extra features like voice messages, stories, groups and more.</p>
      <button>Download</button>

      <div class="quick-actions">
        <div><i class="fa fa-file"></i><span>Send document</span></div>
        <div><i class="fa fa-user-plus"></i><span>Add contact</span></div>
        <div><i class="fa fa-sparkles"></i><span>Ask iChat AI</span></div>
      </div>
    </div>
  `
}

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

    await supabase
      .from('users')
      .update({
        online: true,
        last_seen: new Date().toISOString()
      })
      .eq('uid', user.id)

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

  if (!username) {
    alert('Username required')
    return
  }

  if (editAvatarFile.files[0]) {
    const uploaded = await uploadFile(editAvatarFile.files[0], 'uploads')
    if (uploaded) avatar = uploaded
  }

  const { error } = await supabase
    .from('users')
    .update({
      username,
      bio,
      avatar
    })
    .eq('uid', user.id)

  if (error) {
    alert(error.message)
    return
  }

  await loadMyProfile()
  closeProfileModal()
}

darkModeToggle.onchange = async () => {
  const dark = darkModeToggle.checked
  document.body.classList.toggle('light', !dark)

  await supabase
    .from('users')
    .update({ dark_mode: dark })
    .eq('uid', user.id)
}

notifyToggle.onchange = async () => {
  await supabase
    .from('users')
    .update({ notifications: notifyToggle.checked })
    .eq('uid', user.id)
}

deleteAccountBtn.onclick = async () => {
  if (!confirm('Delete your iChat account?')) return

  await supabase.from('users').delete().eq('uid', user.id)
  await supabase.auth.signOut()
  location.href = 'register.html'
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

  ;(data || []).forEach(u => {
    if (u.uid === user.id) return

    const div = document.createElement('div')
    div.className = 'user-result'

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <img src="${u.avatar || 'assets/logo.png'}" style="width:49px;height:49px;border-radius:50%;object-fit:cover">
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">@${escapeHtml(u.username)}</b>
            <small style="color:#00a884">${u.online ? 'online' : ''}</small>
          </div>
          <small style="color:#8696a0">${u.online ? 'Tap to chat' : lastSeenText(u.last_seen)}</small>
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

  if (error) {
    alert(error.message)
    return
  }

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

  if (error) {
    console.log(error)
    return
  }

  groupList.innerHTML = ''

  ;(data || []).forEach(row => {
    const g = row.groups
    if (!g) return

    const div = document.createElement('div')
    div.className = 'group-item'

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <div style="width:49px;height:49px;border-radius:50%;background:#0a332c;color:#00a884;display:grid;place-items:center;font-size:22px">
          <i class="fa fa-users"></i>
        </div>
        <div style="flex:1">
          <b>${escapeHtml(g.name)}</b><br>
          <small style="color:#8696a0">Group chat</small>
        </div>
      </div>
    `

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
  if (!currentGroup) {
    alert('Open/select a group first')
    return
  }

  const username = groupInviteInput.value.trim().toLowerCase()

  if (!username) {
    alert('Enter username')
    return
  }

  const { data: target, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    alert(error.message)
    return
  }

  if (!target) {
    alert('User not found')
    return
  }

  const exists = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', currentGroup.id)
    .eq('uid', target.uid)
    .maybeSingle()

  if (exists.data) {
    alert('User already in group')
    return
  }

  const insert = await supabase.from('group_members').insert([{
    group_id: currentGroup.id,
    uid: target.uid,
    role: 'member'
  }])

  if (insert.error) {
    alert(insert.error.message)
    return
  }

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

  if (mode === 'dm' && currentChatUser) {
    const { error } = await supabase.from('private_chats').insert([{
      sender_id: user.id,
      receiver_id: currentChatUser.uid,
      text,
      type: 'text'
    }])

    if (error) alert(error.message)
  }

  if (mode === 'group' && currentGroup) {
    const { error } = await supabase.from('group_messages').insert([{
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

    if (first.error || second.error) {
      console.log(first.error || second.error)
      return
    }

    all = [
      ...(first.data || []),
      ...(second.data || [])
    ]

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

    if (res.error) {
      console.log(res.error)
      return
    }

    all = res.data || []
  }

  else {
    showHomeScreen()
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
    await renderMessage(msg)
  }

  messages.scrollTop = messages.scrollHeight
}

async function renderMessage(msg) {
  const div = document.createElement('div')

  div.classList.add(
    'message',
    msg.sender_id === user.id ? 'sent' : 'received'
  )

  if (msg.deleted_for_everyone) {
    div.innerHTML = `<i>This message was deleted</i>`
    messages.appendChild(div)
    return
  }

  if (msg.type === 'image') {
    if (!msg.image || msg.image === 'null') return
    div.innerHTML = `<img src="${msg.image}">`
  }

  else if (msg.type === 'voice') {
    if (!msg.audio || msg.audio === 'null') return
    div.innerHTML = `<audio controls src="${msg.audio}"></audio>`
  }

  else {
    div.innerHTML = `
      ${escapeHtml(msg.text || '')}
      ${msg.edited ? ' <small>(edited)</small>' : ''}
    `
  }

  const reactions = await getReactions(msg.id)

  div.innerHTML += `
    <div class="reactions">${reactions}</div>
    <div class="msg-actions">
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

  await supabase
    .from(table)
    .update({
      deleted_for_everyone: true,
      text: '',
      image: '',
      audio: ''
    })
    .eq('id', messageId)

  loadMessages()
}

window.editMessage = async messageId => {
  const newText = prompt('Edit message')

  if (!newText) return

  const table = mode === 'dm' ? 'private_chats' : 'group_messages'

  await supabase
    .from(table)
    .update({
      text: newText,
      edited: true
    })
    .eq('id', messageId)

  loadMessages()
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
      image: url
    }])
  }

  if (mode === 'group' && currentGroup) {
    await supabase.from('group_messages').insert([{
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
      'voice.webm',
      { type: 'audio/webm' }
    )

    const url = await uploadFile(file, 'uploads')

    if (!url) return

    if (mode === 'dm' && currentChatUser) {
      await supabase.from('private_chats').insert([{
        sender_id: user.id,
        receiver_id: currentChatUser.uid,
        type: 'voice',
        audio: url
      }])
    }

    if (mode === 'group' && currentGroup) {
      await supabase.from('group_messages').insert([{
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

async function uploadFile(file, bucket) {
  if (!file) return null

  const ext = file.name.split('.').pop().toLowerCase()
  const safeName = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(safeName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.log(error)
    alert(error.message)
    return null
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(safeName)

  return data.publicUrl || null
}

supabase
  .channel('ichat-v4')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'private_chats'
  }, () => {
    if (mode === 'dm') loadMessages()
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'group_messages'
  }, () => {
    if (mode === 'group') loadMessages()
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'message_reactions'
  }, () => {
    if (mode !== 'home') loadMessages()
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'deleted_messages'
  }, () => {
    if (mode !== 'home') loadMessages()
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'groups'
  }, loadGroups)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'group_members'
  }, loadGroups)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'stories'
  }, loadStories)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'typing_status'
  }, payload => {
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
  .subscribe(status => {
    console.log('Realtime:', status)
  })

window.addEventListener('beforeunload', async () => {
  await supabase
    .from('users')
    .update({
      online: false,
      last_seen: new Date().toISOString()
    })
    .eq('uid', user.id)
})

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