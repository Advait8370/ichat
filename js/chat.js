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

}