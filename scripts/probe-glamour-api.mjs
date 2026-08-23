/** Temporary Chrome DevTools probe used to inspect the public glamour API. */
const endpoint =
  'https://apiff14risingstones.web.sdo.com/api/home/glamour/glamoursList?page=1&limit=12&order=latest&race_id=1&gender_id=1'

const pages = await fetch('http://127.0.0.1:9333/json').then((response) => response.json())
const page = pages.find((item) => item.type === 'page' && item.url.includes('ff14risingstones'))
if (!page) throw new Error('No debuggable page found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: endpoint } }))
await new Promise((resolve) => setTimeout(resolve, 8_000))

const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('CDP request timed out')), 30_000)
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id !== 2) return
    clearTimeout(timer)
    resolve(message)
  })
  socket.send(JSON.stringify({
    id: 2,
    method: 'Runtime.evaluate',
    params: { expression: 'document.body.innerText', returnByValue: true },
  }))
})

socket.close()
console.log(JSON.stringify(result))
