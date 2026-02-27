// helper function to log output with timestamp
export const logOutput = log => {
  console.log(`${new Date().toLocaleString()}: ${log}\n`)
}

// helper function for user alerts
export const alertUser = message => {
  alert(message)
}

// helper funtion to create element from html string
export const elementFromHtml = html => {
  const parser = new DOMParser()
  const template = document.createElement('template')
  template.innerHTML = parser.parseFromString(html.trim(), "text/html").body.innerHTML // codeql[js/xss] - html is hardcoded in source, not user input
  return template.content.firstElementChild
}

// get year from date input
export const getYear = input => {
  const year = new Date(input).getFullYear()
  return isNaN(year) ? 'NA' : year
}

// get int date from date input
export const getDate = input => {
  const date = new Date(input)
  return isNaN(date) ? 'NA' : date.getTime()
}

// remove special characters from title
export const getCleanTitle = title => {
  return title.trim().split('.')[0].replaceAll(/["'&<>]/g, '')
}

// remove www. from host
export const getCleanHost = url => {
  return new URL(url).hostname.replace('www.', '')
}

// get season and episode from title string
export const getSeasonEpisode = string => {
  const match = string.match(/S(\d+)E(\d+)/i)
  if (match) {
    return match
  }
  return ''
}

// add flash animation class
export const elementAddFlash = el => {
  el.classList.add('element-flash')
  el.addEventListener('animationend', elementRemoveFlash)
}

// remove flash animation class
export const elementRemoveFlash = e => {
  e.target.removeEventListener('animationend', elementRemoveFlash)
  e.target.classList.remove('element-flash')
}

// copy link to clipboard and display 'copied' message
export const copyLink = (e, link, alt = false) => {
  navigator.clipboard.writeText(link)
  const frag = document.createDocumentFragment()
  const copied = elementFromHtml(`<div class="copied" style="left:${alt ? e.clientX - 50 : e.clientX}px; top:${e.clientY - 30}px;">Copied!</div>`)
  frag.appendChild(copied)
  document.body.appendChild(frag)
  setTimeout(() => {
    copied.classList.add('element-fadeout')
    setTimeout(() => {
      copied.remove()
    }, 800)
  }, 600)
}

window.electronAPI.logData((e, data) => logOutput(data))
window.electronAPI.sendAlert((e, data) => alertUser(data))