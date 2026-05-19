import { supabase }
from './supabase.js'

window.register =
async () => {

  const username =
  document.getElementById(
    "username"
  ).value

  const email =
  document.getElementById(
    "email"
  ).value

  const password =
  document.getElementById(
    "password"
  ).value

  if(
    username === "" ||
    email === "" ||
    password === ""
  ){

    alert("Fill all fields")
    return

  }

  const { data, error } =
  await supabase.auth.signUp({

    email,
    password

  })

  if(error){

    alert(error.message)
    return

  }

  await supabase
  .from('users')
  .insert([{

    uid:data.user.id,

    username,

    email

  }])

  alert("Account created!")

  location.href =
  "chat.html"

}

window.loginEmail =
async () => {

  const email =
  document.getElementById(
    "email"
  ).value

  const password =
  document.getElementById(
    "password"
  ).value

  if(
    email === "" ||
    password === ""
  ){

    alert("Fill all fields")
    return

  }

  const { error } =
  await supabase.auth
  .signInWithPassword({

    email,
    password

  })

  if(error){

    alert(error.message)
    return

  }

  location.href =
  "chat.html"

}