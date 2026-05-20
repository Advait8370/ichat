import { supabase } from './supabase.js'

window.register = async () => {
  const username = document.getElementById('username').value.trim().toLowerCase()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()

  if (!username || !email || !password) return alert('Fill all fields')

  const existing = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing.error) return alert(existing.error.message)
  if (existing.data) return alert('Username already exists')

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return alert(error.message)
  if (!data.user) return alert('Could not create account. Please try again.')

  const insert = await supabase.from('users').insert([{
    uid: data.user.id,
    username,
    email,
    avatar: '',
    bio: '',
    online: true,
    notifications: true,
    dark_mode: true
  }])

  if (insert.error) return alert(insert.error.message)

  location.href = 'chat.html'
}

window.loginEmail = async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value.trim()

  if (!email || !password) return alert('Fill all fields')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return alert(error.message)

  location.href = 'chat.html'
}

window.resetPassword = async () => {
  const email = document.getElementById('resetEmail').value.trim()
  if (!email) return alert('Enter your email')

  const redirectTo = location.origin + location.pathname.replace(/reset\.html$/, 'login.html')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) return alert(error.message)

  alert('Password reset link sent. Check your email.')
  location.href = 'login.html'
}
