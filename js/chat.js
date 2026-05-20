import { supabase } from './supabase.js'

const $ = id => document.getElementById(id)
const LOGO = './assets/logo.png'

const messages = $('messages')
const input = $('messageInput')
const sendBtn = $('sendBtn')
const fileInput = $('fileInput')
const sendFileBtn = $('sendFileBtn')
const cancelFileBtn = $('cancelFileBtn')
const filePreview = $('filePreview')
const filePreviewContent = $('filePreviewContent')
const searchInput = $('searchInput')
const searchBox = document.querySelector('.search-box')
const searchResults = $('searchResults')
const recentChats = $('recentChats')
const chatsTab = $('chatsTab')
const groupsTab = $('groupsTab')
const logoutBtn = $('logoutBtn')
const chatName = $('chatName')
const chatAvatar = $('chatAvatar')
const profilePic = $('profilePic')
const myUsername = $('myUsername')
const groupNameInput = $('groupNameInput')
const createGroupBtn = $('createGroupBtn')
const groupInviteInput = $('groupInviteInput')
const addUserToGroupBtn = $('addUserToGroupBtn')
const groupTools = document.querySelector('.group-tools')
const groupList = $('groupList')
const storyInput = $('storyInput')
const storiesList = $('storiesList')
const storyViewer = $('storyViewer')
const storyImage = $('storyImage')
const storyVideo = $('storyVideo')
const storyTextBox = $('storyTextBox')
const textStoryBtn = $('textStoryBtn')
const voiceBtn = $('voiceBtn')
const typingText = $('typingText')
const replyPreview = $('replyPreview')
const replyText = $('replyText')
const cancelReplyBtn = $('cancelReplyBtn')
const messageSearchToggle = $('messageSearchToggle')
const messageSearchBox = $('messageSearchBox')
const messageSearchInput = $('messageSearchInput')
const clearMessageSearchBtn = $('clearMessageSearchBtn')
const pinChatBtn = $('pinChatBtn')
const muteChatBtn = $('muteChatBtn')
const blockUserBtn = $('blockUserBtn')
const groupInfoBtn = $('groupInfoBtn')
const mobileBackBtn = $('mobileBackBtn')

const groupInfoModal = $('groupInfoModal')
const groupInfoImage = $('groupInfoImage')
const groupInfoName = $('groupInfoName')
const groupImageLabel = $('groupImageLabel')
const groupImageInput = $('groupImageInput')
const groupMembersList = $('groupMembersList')
const leaveGroupBtn = $('leaveGroupBtn')
const forwardModal = $('forwardModal')
const forwardTargets = $('forwardTargets')

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
const hideOnlineToggle = $('hideOnlineToggle')
const hideLastSeenToggle = $('hideLastSeenToggle')
const deleteAccountBtn = $('deleteAccountBtn')

let currentChatUser = null
let currentGroup = null
let currentGroupMember = null
let currentGroupMembers = []
let mode = 'dm'
let myProfile = null
let recentChatsLoadId = 0
let searchLoadId = 0
let allCurrentMessages = []
let pendingFile = null
let pendingFilePreviewUrl = ''
let mediaRecorder = null
let audioChunks = []
let typingTimer = null
let replyToMessage = null
let forwardSource = null
let blockedByMe = new Set()
let blockedMe = new Set()
let mutedChats = new Set()
let pinnedChats = new Set()

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

if (!user) {
  location.replace('login.html')
} else {
  await init()
}

async function init() {
  wireEvents()
  await loadMyProfile()
  await loadPrivacyState()
  showSidebarView('chats')
  await Promise.all([loadRecentChats(), loadGroups(), loadStories()])
  setupRealtime()
  requestNotificationPermission()
}

function wireEvents() {
  logoutBtn.onclick = logout
  saveProfileBtn.onclick = saveProfile
  darkModeToggle.onchange = saveSettings
  notifyToggle.onchange = saveSettings
  hideOnlineToggle.onchange = saveSettings
  hideLastSeenToggle.onchange = saveSettings
  deleteAccountBtn.onclick = deleteAccount
  chatsTab.onclick = () => showSidebarView('chats')
  groupsTab.onclick = () => showSidebarView('groups')
  searchInput.oninput = searchUsers
  createGroupBtn.onclick = createGroup
  addUserToGroupBtn.onclick = addUserToGroup
  sendBtn.onclick = sendMessage
  input.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) sendMessage()
  }
  input.oninput = handleTyping
  cancelReplyBtn.onclick = clearReply
  fileInput.onchange = previewSelectedFile
  sendFileBtn.onclick = sendSelectedFile
  cancelFileBtn.onclick = clearFilePreview
  voiceBtn.onclick = toggleVoiceRecording
  storyInput.onchange = addMediaStory
  textStoryBtn.onclick = addTextStory
  messageSearchToggle.onclick = toggleMessageSearch
  messageSearchInput.oninput = () => renderMessages(allCurrentMessages)
  clearMessageSearchBtn.onclick = clearMessageSearch
  pinChatBtn.onclick = togglePinCurrentChat
  muteChatBtn.onclick = toggleMuteCurrentChat
  blockUserBtn.onclick = toggleBlockCurrentUser
  groupInfoBtn.onclick = openGroupInfoModal
  groupImageInput.onchange = updateGroupImage
  leaveGroupBtn.onclick = leaveCurrentGroup
  mobileBackBtn.onclick = () => document.body.classList.remove('chat-open')
  audioCallBtn.onclick = () => startCall('audio')
  videoCallBtn.onclick = () => startCall('video')
  acceptCallBtn.onclick = acceptCall
  rejectCallBtn.onclick = rejectCall
  endCallBtn.onclick = endCall
  muteBtn.onclick = toggleMuteInCall
  cameraBtn.onclick = toggleCameraInCall
  window.addEventListener('beforeunload', markOffline)
}

function safeAvatar(url) {
  if (!url || url === 'null' || url === 'undefined') return LOGO
  const value = String(url).trim()
  if (!value || ['null', 'undefined', 'assets/logo.png', '/logo.png', 'logo.png', 'default.png'].includes(value)) return LOGO
  return value
}

function hasUrl(url) {
  if (!url || url === 'null' || url === 'undefined') return false
  const value = String(url).trim()
  return !!value && value !== 'null' && value !== 'undefined'
}

function escapeHtml(text = '') {
  const div = document.createElement('div')
  div.innerText = text
  return div.innerHTML
}

function chatKey(chatType = mode, id = getCurrentChatId()) {
  return id ? `${chatType}:${id}` : ''
}

function getCurrentChatId() {
  if (mode === 'dm') return currentChatUser?.uid || ''
  return currentGroup?.id ? String(currentGroup.id) : ''
}

function isCurrentChatMuted() {
  return mutedChats.has(chatKey())
}

function isCurrentChatPinned() {
  return pinnedChats.has(chatKey())
}

async function loadMyProfile() {
  const { data, error } = await supabase.from('users').select('*').eq('uid', user.id).maybeSingle()
  if (error) return alert(error.message)

  if (data) {
    myProfile = data
    myUsername.innerText = '@' + data.username
    profilePic.src = safeAvatar(data.avatar)
    editUsername.value = data.username || ''
    editBio.value = data.bio || ''
    darkModeToggle.checked = data.dark_mode !== false
    notifyToggle.checked = data.notifications !== false
    hideOnlineToggle.checked = data.hide_online === true
    hideLastSeenToggle.checked = data.hide_last_seen === true
    document.body.classList.toggle('light', data.dark_mode === false)
    await supabase.from('users').update({
      online: data.hide_online ? false : true,
      last_seen: data.hide_last_seen ? data.last_seen : new Date().toISOString()
    }).eq('uid', user.id)
    return
  }

  const username = 'user_' + Math.floor(Math.random() * 999999)
  const insert = await supabase.from('users').insert([{
    uid: user.id,
    username,
    email: user.email,
    avatar: '',
    bio: '',
    online: true,
    notifications: true,
    dark_mode: true,
    hide_online: false,
    hide_last_seen: false
  }])
  if (insert.error) return alert(insert.error.message)
  await loadMyProfile()
}

async function loadPrivacyState() {
  const [blockedOut, blockedIn, muted, pinned] = await Promise.all([
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id),
    supabase.from('blocked_users').select('blocker_id').eq('blocked_id', user.id),
    supabase.from('muted_chats').select('chat_type, chat_id').eq('uid', user.id),
    supabase.from('pinned_chats').select('chat_type, chat_id').eq('uid', user.id)
  ])
  blockedByMe = new Set((blockedOut.data || []).map(r => r.blocked_id))
  blockedMe = new Set((blockedIn.data || []).map(r => r.blocker_id))
  mutedChats = new Set((muted.data || []).map(r => `${r.chat_type}:${r.chat_id}`))
  pinnedChats = new Set((pinned.data || []).map(r => `${r.chat_type}:${r.chat_id}`))
  updateChatButtons()
}

async function logout() {
  await markOffline()
  await supabase.auth.signOut()
  location.href = 'login.html'
}

async function markOffline() {
  if (!user) return
  await supabase.from('users').update({
    online: false,
    last_seen: myProfile?.hide_last_seen ? myProfile.last_seen : new Date().toISOString()
  }).eq('uid', user.id)
}

window.openProfileModal = () => profileModal.style.display = 'grid'
window.closeProfileModal = () => profileModal.style.display = 'none'
window.openSettingsModal = () => settingsModal.style.display = 'grid'
window.closeSettingsModal = () => settingsModal.style.display = 'none'
window.closeGroupInfoModal = () => groupInfoModal.style.display = 'none'
window.closeForwardModal = () => forwardModal.style.display = 'none'

async function saveProfile() {
  const username = editUsername.value.trim().toLowerCase()
  const bio = editBio.value.trim()
  let avatar = safeAvatar(myProfile.avatar)
  if (!username) return alert('Username required')
  if (editAvatarFile.files[0]) {
    const uploaded = await uploadFile(editAvatarFile.files[0])
    if (uploaded) avatar = uploaded.url
  }
  const { error } = await supabase.from('users').update({ username, bio, avatar }).eq('uid', user.id)
  if (error) return alert(error.message)
  await loadMyProfile()
  closeProfileModal()
}

async function saveSettings() {
  const settings = {
    dark_mode: darkModeToggle.checked,
    notifications: notifyToggle.checked,
    hide_online: hideOnlineToggle.checked,
    hide_last_seen: hideLastSeenToggle.checked,
    online: hideOnlineToggle.checked ? false : true
  }
  document.body.classList.toggle('light', !settings.dark_mode)
  const { error } = await supabase.from('users').update(settings).eq('uid', user.id)
  if (error) return alert(error.message)
  await loadMyProfile()
}

async function deleteAccount() {
  if (!confirm('Delete your iChat account?')) return
  await supabase.from('users').delete().eq('uid', user.id)
  await supabase.auth.signOut()
  location.href = 'register.html'
}

function showSidebarView(view) {
  chatsTab.classList.toggle('active', view === 'chats')
  groupsTab.classList.toggle('active', view === 'groups')
  const isChats = view === 'chats'
  searchBox.hidden = !isChats
  groupTools.hidden = isChats
  groupList.hidden = isChats
  recentChats.style.display = isChats && !searchInput.value.trim() ? 'block' : 'none'
  searchResults.style.display = isChats && searchInput.value.trim() ? 'block' : 'none'
  if (!isChats) loadGroups()
}

async function loadRecentChats() {
  const loadId = ++recentChatsLoadId
  recentChats.innerHTML = '<div class="loading">Loading chats...</div>'

  const sent = await supabase.from('private_chats').select('*').eq('sender_id', user.id)
  const received = await supabase.from('private_chats').select('*').eq('receiver_id', user.id)
  if (loadId !== recentChatsLoadId) return

  const chatMap = new Map()
  ;[...(sent.data || []), ...(received.data || [])].forEach(msg => {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    if (!otherId || otherId === user.id) return
    const old = chatMap.get(otherId)
    if (!old || new Date(msg.created_at) > new Date(old.created_at)) chatMap.set(otherId, msg)
  })

  const items = []
  for (const [otherId, msg] of chatMap.entries()) {
    const [{ data: other }, { data: unread }] = await Promise.all([
      supabase.from('users').select('*').eq('uid', otherId).maybeSingle(),
      supabase.from('private_chats').select('id').eq('sender_id', otherId).eq('receiver_id', user.id).eq('seen', false)
    ])
    if (loadId !== recentChatsLoadId || !other) continue
    items.push({
      other,
      msg,
      unread: unread?.length || 0,
      pinned: pinnedChats.has(`dm:${otherId}`),
      muted: mutedChats.has(`dm:${otherId}`)
    })
  }

  items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.msg.created_at) - new Date(a.msg.created_at))
  recentChats.innerHTML = ''
  if (!items.length) {
    recentChats.innerHTML = '<div class="empty-chat">No chats yet.</div>'
    return
  }

  items.forEach(item => {
    const div = document.createElement('div')
    div.className = 'chat-item'
    div.innerHTML = `
      <img src="${escapeHtml(safeAvatar(item.other.avatar))}" alt="">
      <div class="chat-meta">
        <b>@${escapeHtml(item.other.username)}</b>
        <small>${escapeHtml(previewMessage(item.msg))}</small>
      </div>
      <div class="chat-flags">
        ${item.pinned ? '<i class="fa fa-thumbtack"></i>' : ''}
        ${item.muted ? '<i class="fa fa-bell-slash"></i>' : ''}
        ${item.unread ? `<span class="unread">${item.unread}</span>` : ''}
      </div>
    `
    div.onclick = () => openDM(item.other)
    recentChats.appendChild(div)
  })
}

async function searchUsers() {
  const loadId = ++searchLoadId
  const value = searchInput.value.trim()
  if (!value) {
    searchResults.innerHTML = ''
    searchResults.style.display = 'none'
    recentChats.style.display = 'block'
    return
  }
  recentChats.style.display = 'none'
  searchResults.style.display = 'block'
  searchResults.innerHTML = '<div class="loading">Searching...</div>'

  const { data, error } = await supabase.from('users').select('*').ilike('username', `%${value}%`)
  if (error) return console.log(error)
  if (loadId !== searchLoadId) return
  searchResults.innerHTML = ''

  ;(data || []).forEach(u => {
    if (u.uid === user.id) return
    const div = document.createElement('div')
    div.className = 'user-result'
    div.innerHTML = `
      <img src="${escapeHtml(safeAvatar(u.avatar))}" alt="">
      <div class="chat-meta">
        <b>@${escapeHtml(u.username)}</b>
        <small>${userStatusText(u)}</small>
      </div>
    `
    div.onclick = () => openDM(u)
    searchResults.appendChild(div)
  })
}

function openDM(u) {
  mode = 'dm'
  currentChatUser = u
  currentGroup = null
  currentGroupMember = null
  chatName.innerText = '@' + u.username
  chatAvatar.src = safeAvatar(u.avatar)
  typingText.innerText = userStatusText(u)
  document.body.classList.add('chat-open')
  updateChatButtons()
  loadMessages()
}

async function createGroup() {
  const name = groupNameInput.value.trim()
  if (!name) return
  const { data, error } = await supabase.from('groups').insert([{ name, created_by: user.id, image: '' }]).select().single()
  if (error) return alert(error.message)
  await supabase.from('group_members').insert([{ group_id: data.id, uid: user.id, role: 'admin' }])
  groupNameInput.value = ''
  await loadGroups()
  openGroup(data)
}

async function loadGroups() {
  const { data, error } = await supabase.from('group_members').select('group_id, role, groups(*)').eq('uid', user.id)
  if (error) return console.log(error)
  groupList.innerHTML = ''
  if (!(data || []).length) {
    groupList.innerHTML = '<div class="empty-chat">No groups yet.</div>'
    return
  }
  ;(data || []).forEach(row => {
    const g = row.groups
    if (!g) return
    const div = document.createElement('div')
    div.className = 'group-item'
    div.innerHTML = `
      <img src="${escapeHtml(safeAvatar(g.image))}" alt="">
      <div class="chat-meta">
        <b>${escapeHtml(g.name)}</b>
        <small>${row.role === 'admin' ? '<span class="admin-badge">Admin</span>' : 'Group chat'}</small>
      </div>
    `
    div.onclick = () => openGroup(g)
    groupList.appendChild(div)
  })
}

async function openGroup(g) {
  mode = 'group'
  currentGroup = g
  currentChatUser = null
  chatName.innerText = g.name
  chatAvatar.src = safeAvatar(g.image)
  typingText.innerText = 'Group chat'
  document.body.classList.add('chat-open')
  await loadGroupMembers()
  updateChatButtons()
  loadMessages()
}

async function loadGroupMembers() {
  if (!currentGroup) return
  const { data, error } = await supabase.from('group_members').select('id, group_id, uid, role, users(*)').eq('group_id', currentGroup.id)
  if (error) return console.log(error)
  currentGroupMembers = data || []
  currentGroupMember = currentGroupMembers.find(m => m.uid === user.id) || null
}

function isGroupAdmin() {
  return currentGroupMember?.role === 'admin' || currentGroup?.created_by === user.id
}

async function addUserToGroup() {
  if (!currentGroup) return alert('Open/select a group first')
  if (!isGroupAdmin()) return alert('Only admins can add users')
  const username = groupInviteInput.value.trim().toLowerCase()
  if (!username) return alert('Enter username')
  const { data: target, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
  if (error) return alert(error.message)
  if (!target) return alert('User not found')
  const insert = await supabase.from('group_members').insert([{ group_id: currentGroup.id, uid: target.uid, role: 'member' }])
  if (insert.error) return alert(insert.error.message)
  groupInviteInput.value = ''
  await loadGroupMembers()
  await openGroupInfoModal()
  loadGroups()
}

async function openGroupInfoModal() {
  if (!currentGroup) return
  await loadGroupMembers()
  groupInfoImage.src = safeAvatar(currentGroup.image)
  groupInfoName.innerText = currentGroup.name
  groupImageLabel.hidden = !isGroupAdmin()
  groupMembersList.innerHTML = ''
  currentGroupMembers.forEach(member => {
    const u = member.users || {}
    const div = document.createElement('div')
    div.className = 'member-row'
    div.innerHTML = `
      <img src="${escapeHtml(safeAvatar(u.avatar))}" alt="">
      <div class="meta">
        <b>@${escapeHtml(u.username || member.uid)}</b>
        <small>${member.role === 'admin' ? '<span class="admin-badge">Admin</span>' : 'Member'}</small>
      </div>
      ${isGroupAdmin() && member.uid !== user.id ? `<button class="danger" onclick="removeGroupMember(${member.id})">Remove</button>` : ''}
    `
    groupMembersList.appendChild(div)
  })
  groupInfoModal.style.display = 'grid'
}

window.removeGroupMember = async memberId => {
  if (!isGroupAdmin()) return alert('Only admins can remove members')
  await supabase.from('group_members').delete().eq('id', memberId)
  await loadGroupMembers()
  await openGroupInfoModal()
  loadGroups()
}

async function leaveCurrentGroup() {
  if (!currentGroupMember) return
  if (!confirm('Leave this group?')) return
  await supabase.from('group_members').delete().eq('id', currentGroupMember.id)
  currentGroup = null
  currentGroupMember = null
  groupInfoModal.style.display = 'none'
  messages.innerHTML = '<div class="empty-chat">Search user or open group to start chatting.</div>'
  chatName.innerText = 'Select User or Group'
  chatAvatar.src = LOGO
  await loadGroups()
}

async function updateGroupImage() {
  if (!currentGroup || !isGroupAdmin() || !groupImageInput.files[0]) return
  const uploaded = await uploadFile(groupImageInput.files[0])
  if (!uploaded) return
  const { error } = await supabase.from('groups').update({ image: uploaded.url }).eq('id', currentGroup.id)
  if (error) return alert(error.message)
  currentGroup.image = uploaded.url
  chatAvatar.src = uploaded.url
  await openGroupInfoModal()
  loadGroups()
}

function updateChatButtons() {
  const hasChat = !!getCurrentChatId()
  pinChatBtn.disabled = !hasChat
  muteChatBtn.disabled = !hasChat
  blockUserBtn.hidden = mode !== 'dm'
  groupInfoBtn.hidden = mode !== 'group'
  audioCallBtn.disabled = mode !== 'dm' || !currentChatUser
  videoCallBtn.disabled = mode !== 'dm' || !currentChatUser
  pinChatBtn.classList.toggle('active', isCurrentChatPinned())
  muteChatBtn.classList.toggle('active', isCurrentChatMuted())
  blockUserBtn.classList.toggle('active', currentChatUser && blockedByMe.has(currentChatUser.uid))
  blockUserBtn.title = currentChatUser && blockedByMe.has(currentChatUser.uid) ? 'Unblock user' : 'Block user'
}

async function togglePinCurrentChat() {
  const id = getCurrentChatId()
  if (!id) return
  const key = chatKey()
  if (pinnedChats.has(key)) {
    await supabase.from('pinned_chats').delete().eq('uid', user.id).eq('chat_type', mode).eq('chat_id', id)
    pinnedChats.delete(key)
  } else {
    await supabase.from('pinned_chats').upsert([{ uid: user.id, chat_type: mode, chat_id: id }], { onConflict: 'uid,chat_type,chat_id' })
    pinnedChats.add(key)
  }
  updateChatButtons()
  loadRecentChats()
}

async function toggleMuteCurrentChat() {
  const id = getCurrentChatId()
  if (!id) return
  const key = chatKey()
  if (mutedChats.has(key)) {
    await supabase.from('muted_chats').delete().eq('uid', user.id).eq('chat_type', mode).eq('chat_id', id)
    mutedChats.delete(key)
  } else {
    await supabase.from('muted_chats').upsert([{ uid: user.id, chat_type: mode, chat_id: id }], { onConflict: 'uid,chat_type,chat_id' })
    mutedChats.add(key)
  }
  updateChatButtons()
  loadRecentChats()
}

async function toggleBlockCurrentUser() {
  if (!currentChatUser) return
  if (blockedByMe.has(currentChatUser.uid)) {
    await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', currentChatUser.uid)
    blockedByMe.delete(currentChatUser.uid)
  } else {
    await supabase.from('blocked_users').upsert([{ blocker_id: user.id, blocked_id: currentChatUser.uid }], { onConflict: 'blocker_id,blocked_id' })
    blockedByMe.add(currentChatUser.uid)
  }
  updateChatButtons()
}

function isBlockedChat() {
  return mode === 'dm' && currentChatUser && (blockedByMe.has(currentChatUser.uid) || blockedMe.has(currentChatUser.uid))
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text) return
  if (isBlockedChat()) return alert('Messages cannot be sent because this user is blocked.')
  if (mode === 'dm' && !currentChatUser) return
  if (mode === 'group' && !currentGroup) return
  input.value = ''
  await setTyping(false)
  await insertMessage({ text, type: 'text' })
  clearReply()
}

async function insertMessage(payload, targetMode = mode, target = null) {
  const replyId = replyToMessage ? replyToMessage.id : null
  if (targetMode === 'dm') {
    const receiver = target || currentChatUser
    if (!receiver) return
    const { error } = await supabase.from('private_chats').insert([{
      sender_id: user.id,
      receiver_id: receiver.uid,
      text: payload.text || '',
      type: payload.type || 'text',
      image: payload.image || '',
      audio: payload.audio || '',
      file_url: payload.file_url || '',
      file_name: payload.file_name || '',
      file_type: payload.file_type || '',
      reply_to: replyId
    }])
    if (error) return alert(error.message)
  } else {
    const group = target || currentGroup
    if (!group) return
    const { error } = await supabase.from('group_messages').insert([{
      group_id: group.id,
      sender_id: user.id,
      text: payload.text || '',
      type: payload.type || 'text',
      image: payload.image || '',
      audio: payload.audio || '',
      file_url: payload.file_url || '',
      file_name: payload.file_name || '',
      file_type: payload.file_type || '',
      reply_to: replyId
    }])
    if (error) return alert(error.message)
  }
  await loadMessages()
  await loadRecentChats()
}

async function loadMessages() {
  messages.innerHTML = '<div class="loading">Loading messages...</div>'
  let all = []
  if (mode === 'dm' && currentChatUser) {
    const first = await supabase.from('private_chats').select('*').match({ sender_id: user.id, receiver_id: currentChatUser.uid })
    const second = await supabase.from('private_chats').select('*').match({ sender_id: currentChatUser.uid, receiver_id: user.id })
    if (first.error || second.error) return console.log(first.error || second.error)
    all = [...(first.data || []), ...(second.data || [])]
    await supabase.from('private_chats').update({ seen: true }).eq('sender_id', currentChatUser.uid).eq('receiver_id', user.id)
  } else if (mode === 'group' && currentGroup) {
    const res = await supabase.from('group_messages').select('*').eq('group_id', currentGroup.id)
    if (res.error) return console.log(res.error)
    all = res.data || []
  } else {
    messages.innerHTML = '<div class="empty-chat">Search user or open group to start chatting.</div>'
    return
  }
  all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  allCurrentMessages = all
  await renderMessages(all)
}

async function renderMessages(all) {
  const term = messageSearchInput.value.trim().toLowerCase()
  messages.innerHTML = ''
  const visible = term ? all.filter(m => messageSearchText(m).toLowerCase().includes(term)) : all
  if (!visible.length) {
    messages.innerHTML = `<div class="empty-chat">${term ? 'No matching messages.' : 'No messages yet.'}</div>`
    return
  }
  for (const msg of visible) {
    const deleted = await isDeletedForMe(msg.id)
    if (!deleted) await renderMessage(msg, all, !!term)
  }
  messages.scrollTop = messages.scrollHeight
}

async function renderMessage(msg, allMessages, highlighted = false) {
  const div = document.createElement('div')
  div.className = `message ${msg.sender_id === user.id ? 'sent' : 'received'}${highlighted ? ' highlight' : ''}`
  if (msg.deleted_for_everyone) {
    div.innerHTML = `<i>This message was deleted</i><span class="msg-time">${formatTime(msg.created_at)}</span>`
    messages.appendChild(div)
    return
  }

  let replyHtml = ''
  if (msg.reply_to) {
    const original = allMessages.find(m => m.id === msg.reply_to)
    if (original) replyHtml = `<div class="reply-box">${escapeHtml(messageSearchText(original))}</div>`
  }

  div.innerHTML = replyHtml + mediaHtml(msg)
  const reactions = await getReactions(msg.id)
  div.innerHTML += `
    <div class="reactions">${reactions}</div>
    <span class="msg-time">${formatTime(msg.created_at)}${msg.edited ? ' edited' : ''}${msg.sender_id === user.id && mode === 'dm' ? ` <span class="tick">${msg.seen ? '✓✓' : '✓'}</span>` : ''}</span>
    <div class="msg-actions">
      <button onclick="replyMessage(${msg.id})">Reply</button>
      <button onclick="copyMessage(${msg.id})">Copy</button>
      <button onclick="forwardMessage(${msg.id})">Forward</button>
      ${msg.sender_id === user.id && msg.type === 'text' ? `<button onclick="editMessage(${msg.id})">Edit</button>` : ''}
      <button onclick="deleteForMe(${msg.id})">Delete me</button>
      ${msg.sender_id === user.id ? `<button onclick="deleteForEveryone(${msg.id})">Delete all</button>` : ''}
      <button onclick="reactMessage(${msg.id}, '❤️')">❤️</button>
      <button onclick="reactMessage(${msg.id}, '😂')">😂</button>
      <button onclick="reactMessage(${msg.id}, '👍')">👍</button>
    </div>
  `
  messages.appendChild(div)
}

function mediaHtml(msg) {
  const fileUrl = msg.file_url || msg.image || msg.audio || ''
  const fileName = msg.file_name || fileUrl.split('/').pop() || 'Download'
  if (msg.type === 'image' && hasUrl(fileUrl)) {
    return `<img src="${escapeHtml(fileUrl)}" alt=""><a class="download-btn" href="${escapeHtml(fileUrl)}" download><i class="fa fa-download"></i> Download</a>`
  }
  if (msg.type === 'video' && hasUrl(fileUrl)) {
    return `<video controls src="${escapeHtml(fileUrl)}"></video><a class="download-btn" href="${escapeHtml(fileUrl)}" download><i class="fa fa-download"></i> Download</a>`
  }
  if ((msg.type === 'voice' || msg.type === 'audio') && hasUrl(fileUrl)) {
    return `<audio controls src="${escapeHtml(fileUrl)}"></audio><br><a class="download-btn" href="${escapeHtml(fileUrl)}" download><i class="fa fa-download"></i> Download</a>`
  }
  if (msg.type === 'file' && hasUrl(fileUrl)) {
    return `<div class="file-card"><i class="fa fa-file"></i><a href="${escapeHtml(fileUrl)}" target="_blank" download>${escapeHtml(fileName)}</a></div><a class="download-btn" href="${escapeHtml(fileUrl)}" download><i class="fa fa-download"></i> Download</a>`
  }
  return escapeHtml(msg.text || '')
}

function messageSearchText(msg) {
  return msg.text || msg.file_name || previewMessage(msg)
}

function previewMessage(msg) {
  if (msg.deleted_for_everyone) return 'This message was deleted'
  if (msg.type === 'image') return 'Photo'
  if (msg.type === 'video') return 'Video'
  if (msg.type === 'voice' || msg.type === 'audio') return 'Voice message'
  if (msg.type === 'file') return msg.file_name || 'File'
  return msg.text || ''
}

async function isDeletedForMe(messageId) {
  const { data } = await supabase.from('deleted_messages').select('id').eq('message_id', messageId).eq('uid', user.id).eq('chat_type', mode).maybeSingle()
  return !!data
}

async function getReactions(messageId) {
  const { data } = await supabase.from('message_reactions').select('emoji').eq('message_id', messageId).eq('chat_type', mode)
  return (data || []).map(r => escapeHtml(r.emoji)).join(' ')
}

window.replyMessage = async messageId => {
  const msg = allCurrentMessages.find(m => m.id === messageId)
  if (!msg) return
  replyToMessage = msg
  replyText.innerText = messageSearchText(msg)
  replyPreview.style.display = 'flex'
}

function clearReply() {
  replyToMessage = null
  replyPreview.style.display = 'none'
  replyText.innerText = ''
}

window.copyMessage = async messageId => {
  const msg = allCurrentMessages.find(m => m.id === messageId)
  if (!msg) return
  await navigator.clipboard.writeText(messageSearchText(msg))
}

window.forwardMessage = async messageId => {
  forwardSource = allCurrentMessages.find(m => m.id === messageId)
  if (!forwardSource) return
  forwardTargets.innerHTML = '<div class="loading">Loading targets...</div>'
  forwardModal.style.display = 'grid'
  const [usersRes, groupsRes] = await Promise.all([
    supabase.from('users').select('*').neq('uid', user.id),
    supabase.from('group_members').select('group_id, groups(*)').eq('uid', user.id)
  ])
  forwardTargets.innerHTML = ''
  ;(usersRes.data || []).forEach(u => addForwardTarget('dm', u, '@' + u.username, safeAvatar(u.avatar)))
  ;(groupsRes.data || []).forEach(row => row.groups && addForwardTarget('group', row.groups, row.groups.name, safeAvatar(row.groups.image)))
}

function addForwardTarget(targetMode, target, label, avatar) {
  const div = document.createElement('div')
  div.className = 'forward-target'
  div.innerHTML = `<img src="${escapeHtml(avatar)}" alt=""><div class="meta"><b>${escapeHtml(label)}</b><small>${targetMode}</small></div>`
  div.onclick = () => sendForward(targetMode, target)
  forwardTargets.appendChild(div)
}

async function sendForward(targetMode, target) {
  if (!forwardSource) return
  const payload = {
    text: forwardSource.text ? `Forwarded: ${forwardSource.text}` : 'Forwarded',
    type: forwardSource.type || 'text',
    image: forwardSource.image || '',
    audio: forwardSource.audio || '',
    file_url: forwardSource.file_url || forwardSource.image || forwardSource.audio || '',
    file_name: forwardSource.file_name || '',
    file_type: forwardSource.file_type || ''
  }
  await insertMessage(payload, targetMode, target)
  await supabase.from('forwarded_messages').insert([{ from_message_id: forwardSource.id, from_chat_type: mode, to_chat_type: targetMode, to_chat_id: targetMode === 'dm' ? target.uid : String(target.id), uid: user.id }])
  forwardModal.style.display = 'none'
}

window.reactMessage = async (messageId, emoji) => {
  await supabase.from('message_reactions').insert([{ message_id: messageId, uid: user.id, emoji, chat_type: mode }])
  loadMessages()
}

window.deleteForMe = async messageId => {
  await supabase.from('deleted_messages').insert([{ message_id: messageId, uid: user.id, chat_type: mode }])
  loadMessages()
}

window.deleteForEveryone = async messageId => {
  const table = mode === 'dm' ? 'private_chats' : 'group_messages'
  await supabase.from(table).update({ deleted_for_everyone: true, text: '', image: '', audio: '', file_url: '', file_name: '', file_type: '' }).eq('id', messageId)
  loadMessages()
  loadRecentChats()
}

window.editMessage = async messageId => {
  const newText = prompt('Edit message')
  if (!newText) return
  const table = mode === 'dm' ? 'private_chats' : 'group_messages'
  await supabase.from(table).update({ text: newText, edited: true }).eq('id', messageId)
  loadMessages()
  loadRecentChats()
}

function previewSelectedFile() {
  const file = fileInput.files[0]
  if (!file) return
  pendingFile = file
  if (pendingFilePreviewUrl) URL.revokeObjectURL(pendingFilePreviewUrl)
  pendingFilePreviewUrl = URL.createObjectURL(file)
  const kind = fileKind(file)
  if (kind === 'image') filePreviewContent.innerHTML = `<img src="${pendingFilePreviewUrl}" alt=""><b>${escapeHtml(file.name)}</b>`
  else if (kind === 'video') filePreviewContent.innerHTML = `<video src="${pendingFilePreviewUrl}" controls></video><b>${escapeHtml(file.name)}</b>`
  else filePreviewContent.innerHTML = `<div class="file-card"><i class="fa fa-file"></i><b>${escapeHtml(file.name)}</b></div>`
  filePreview.hidden = false
}

function clearFilePreview() {
  pendingFile = null
  fileInput.value = ''
  filePreview.hidden = true
  filePreviewContent.innerHTML = ''
  if (pendingFilePreviewUrl) URL.revokeObjectURL(pendingFilePreviewUrl)
  pendingFilePreviewUrl = ''
}

async function sendSelectedFile() {
  if (!pendingFile) return
  if (isBlockedChat()) return alert('Messages cannot be sent because this user is blocked.')
  const uploaded = await uploadFile(pendingFile)
  if (!uploaded) return
  const kind = fileKind(pendingFile)
  const payload = {
    text: '',
    type: kind,
    file_url: uploaded.url,
    file_name: pendingFile.name,
    file_type: pendingFile.type || kind,
    image: kind === 'image' ? uploaded.url : '',
    audio: kind === 'audio' || kind === 'voice' ? uploaded.url : ''
  }
  await insertMessage(payload)
  clearReply()
  clearFilePreview()
}

function fileKind(file) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

async function toggleVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    voiceBtn.innerHTML = '<i class="fa fa-microphone"></i>'
    return
  }
  if (isBlockedChat()) return alert('Messages cannot be sent because this user is blocked.')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder = new MediaRecorder(stream)
  audioChunks = []
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data)
  mediaRecorder.onstop = async () => {
    stream.getTracks().forEach(track => track.stop())
    const blob = new Blob(audioChunks, { type: 'audio/webm' })
    const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
    const uploaded = await uploadFile(file)
    if (uploaded) await insertMessage({ type: 'voice', audio: uploaded.url, file_url: uploaded.url, file_name: 'voice.webm', file_type: 'audio/webm' })
  }
  mediaRecorder.start()
  voiceBtn.innerHTML = '<i class="fa fa-stop"></i>'
}

async function uploadFile(file) {
  if (!file) return null
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const safeName = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('uploads').upload(safeName, file, { cacheControl: '3600', upsert: false })
  if (error) {
    alert(error.message)
    return null
  }
  const { data } = supabase.storage.from('uploads').getPublicUrl(safeName)
  return { url: data.publicUrl, path: safeName }
}

async function addMediaStory() {
  const file = storyInput.files[0]
  if (!file) return
  const uploaded = await uploadFile(file)
  if (!uploaded) return
  await supabase.from('stories').insert([{ uid: user.id, image: uploaded.url, text: '', expires_at: new Date(Date.now() + 86400000).toISOString() }])
  storyInput.value = ''
  loadStories()
}

async function addTextStory() {
  const text = prompt('Enter text status')
  if (!text) return
  await supabase.from('stories').insert([{ uid: user.id, text, image: '', bg: '#00a884', expires_at: new Date(Date.now() + 86400000).toISOString() }])
  loadStories()
}

async function loadStories() {
  const { data } = await supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
  storiesList.innerHTML = ''
  ;(data || []).forEach(s => {
    const hasMedia = hasUrl(s.image)
    if (!hasMedia && !s.text) return
    const div = document.createElement('div')
    div.className = 'story-bubble'
    div.innerHTML = hasMedia ? `<img src="${escapeHtml(s.image)}" alt="">` : 'T'
    div.onclick = () => openStory(s)
    storiesList.appendChild(div)
  })
}

function openStory(s) {
  storyImage.style.display = 'none'
  storyVideo.style.display = 'none'
  storyTextBox.style.display = 'none'
  if (hasUrl(s.image)) {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(s.image)) {
      storyVideo.src = s.image
      storyVideo.style.display = 'block'
    } else {
      storyImage.src = s.image
      storyImage.style.display = 'block'
    }
  } else {
    storyTextBox.innerText = s.text
    storyTextBox.style.background = s.bg || '#00a884'
    storyTextBox.style.display = 'block'
  }
  storyViewer.style.display = 'grid'
}

window.closeStoryViewer = () => {
  storyViewer.style.display = 'none'
  storyImage.src = ''
  storyVideo.src = ''
  storyTextBox.innerText = ''
}

function toggleMessageSearch() {
  messageSearchBox.hidden = !messageSearchBox.hidden
  if (!messageSearchBox.hidden) messageSearchInput.focus()
}

function clearMessageSearch() {
  messageSearchInput.value = ''
  messageSearchBox.hidden = true
  renderMessages(allCurrentMessages)
}

async function handleTyping() {
  if (mode !== 'dm' || !currentChatUser) return
  await setTyping(true)
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => setTyping(false), 1200)
}

async function setTyping(isTyping) {
  if (!currentChatUser) return
  await supabase.from('typing_status').upsert([{ sender_id: user.id, receiver_id: currentChatUser.uid, typing: isTyping, updated_at: new Date().toISOString() }], { onConflict: 'sender_id,receiver_id' })
}

function userStatusText(profile) {
  if (profile.hide_online) return ''
  if (profile.online) return 'online'
  if (profile.hide_last_seen) return 'offline'
  return lastSeenText(profile.last_seen)
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
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function startCall(type) {
  if (!currentChatUser) return alert('Select a user first. Calls work only in private chat.')
  activeCall = { caller_id: user.id, receiver_id: currentChatUser.uid, type, status: 'ringing' }
  await setupPeer(type)
  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)
  const { data, error } = await supabase.from('calls').insert([{ caller_id: user.id, receiver_id: currentChatUser.uid, type, status: 'ringing', offer }]).select().single()
  if (error) return alert(error.message)
  activeCall = data
  callModal.style.display = 'grid'
}

async function setupPeer(type) {
  peer = new RTCPeerConnection(rtcConfig)
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
  localVideo.srcObject = localStream
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream))
  peer.ontrack = event => remoteVideo.srcObject = event.streams[0]
  peer.onicecandidate = async event => {
    if (!event.candidate || !activeCall?.id) return
    const { data } = await supabase.from('calls').select('ice').eq('id', activeCall.id).maybeSingle()
    const oldIce = data?.ice || []
    await supabase.from('calls').update({ ice: [...oldIce, event.candidate.toJSON()] }).eq('id', activeCall.id)
  }
}

async function handleIncomingCall(call) {
  if (call.receiver_id !== user.id || call.status !== 'ringing') return
  activeCall = call
  incomingCallTitle.innerText = call.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'
  incomingCallText.innerText = 'Incoming call...'
  incomingCallModal.style.display = 'grid'
}

async function acceptCall() {
  if (!activeCall) return
  incomingCallModal.style.display = 'none'
  callModal.style.display = 'grid'
  await setupPeer(activeCall.type)
  await peer.setRemoteDescription(new RTCSessionDescription(activeCall.offer))
  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)
  await supabase.from('calls').update({ status: 'accepted', answer }).eq('id', activeCall.id)
}

async function rejectCall() {
  if (!activeCall) return
  await supabase.from('calls').update({ status: 'rejected' }).eq('id', activeCall.id)
  incomingCallModal.style.display = 'none'
  activeCall = null
}

async function endCall() {
  if (activeCall?.id) await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id)
  closeCallUI()
}

function closeCallUI() {
  callModal.style.display = 'none'
  incomingCallModal.style.display = 'none'
  if (peer) peer.close()
  peer = null
  if (localStream) localStream.getTracks().forEach(track => track.stop())
  localStream = null
  localVideo.srcObject = null
  remoteVideo.srcObject = null
  activeCall = null
  isMuted = false
  cameraOff = false
}

function toggleMuteInCall() {
  if (!localStream) return
  isMuted = !isMuted
  localStream.getAudioTracks().forEach(track => track.enabled = !isMuted)
  muteBtn.innerHTML = isMuted ? '<i class="fa fa-microphone-slash"></i>' : '<i class="fa fa-microphone"></i>'
}

function toggleCameraInCall() {
  if (!localStream) return
  cameraOff = !cameraOff
  localStream.getVideoTracks().forEach(track => track.enabled = !cameraOff)
  cameraBtn.innerHTML = cameraOff ? '<i class="fa fa-video-slash"></i>' : '<i class="fa fa-video"></i>'
}

async function handleCallUpdate(call) {
  if (!activeCall || call.id !== activeCall.id) return
  if (call.status === 'accepted' && call.answer && user.id === call.caller_id) await peer.setRemoteDescription(new RTCSessionDescription(call.answer))
  if (call.ice && peer) {
    for (const c of call.ice) {
      try { await peer.addIceCandidate(new RTCIceCandidate(c)) } catch {}
    }
  }
  if (['ended', 'rejected'].includes(call.status)) closeCallUI()
}

function setupRealtime() {
  supabase
    .channel('ichat-v6')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'private_chats' }, payload => {
      if (payload.eventType === 'INSERT' && payload.new.receiver_id === user.id && !mutedChats.has(`dm:${payload.new.sender_id}`)) showNotification('New message', payload.new.text || previewMessage(payload.new))
      if (mode === 'dm') loadMessages()
      loadRecentChats()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, () => { if (mode === 'group') loadMessages() })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => { loadGroups(); if (currentGroup) refreshCurrentGroup() })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => { loadGroups(); if (currentGroup) loadGroupMembers() })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, loadStories)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status' }, payload => {
      const t = payload.new
      if (mode === 'dm' && currentChatUser && t.sender_id === currentChatUser.uid && t.receiver_id === user.id) typingText.innerText = t.typing ? 'typing...' : userStatusText(currentChatUser)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, payload => { handleIncomingCall(payload.new); handleCallUpdate(payload.new) })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, loadMessages)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_messages' }, loadMessages)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, loadPrivacyState)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'muted_chats' }, loadPrivacyState)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pinned_chats' }, loadPrivacyState)
    .subscribe(status => console.log('Realtime:', status))
}

async function refreshCurrentGroup() {
  const { data } = await supabase.from('groups').select('*').eq('id', currentGroup.id).maybeSingle()
  if (data) {
    currentGroup = data
    chatName.innerText = data.name
    chatAvatar.src = safeAvatar(data.image)
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
}

function showNotification(title, body) {
  if (!myProfile?.notifications || !('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: LOGO })
}
