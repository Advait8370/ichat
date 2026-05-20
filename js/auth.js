import { supabase } from './supabase.js'

window.register = async () => {
  const username = document.getElementById('username').value.trim().toLowerCase()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()

  if (!username || !email || !password) {
    alert('Fill all fields')
    return
  }

  const existing = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing.data) {
    alert('Username already exists')
    return
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    alert(error.message)
    return
  }

  const insert = await supabase.from('users').insert([{
    uid: data.user.id,
    username,
    email,
    avatar: '',
    bio: '',
    online: true
  }])

  if (insert.error) {
    alert(insert.error.message)
    return
  }

  location.href = 'chat.html'
}

window.loginEmail = async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()

  if (!email || !password) {
    alert('Fill all fields')
    return
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    alert(error.message)
    return
  }

  location.href = 'chat.html'
}