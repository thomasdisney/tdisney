const getCenter = function(el) {
  const rect = el.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const rotatePoint = function(x, y, cx, cy, angle) {
  const radians = (Math.PI / 180) * angle
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const nx = cos * (x - cx) + sin * (y - cy) + cx
  const ny = cos * (y - cy) - sin * (x - cx) + cy
  return { x: nx, y: ny }
}

const checkOverlap = function(elem1, elem2) {
  const rect1 = elem1.getBoundingClientRect()
  const rect2 = elem2.getBoundingClientRect()
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  )
}

const Z_INDEX_LAYERS = {
  SQUARE: 5,
  TRUCK: 10,
  FORKLIFT: 20,
  BOT: 30,
  TRANSPORTABLE_SQUARE: 35,
  STUFF: 40
}

let draggableElements = new Set()
let maxZIndex = 1
let objectScale = 0.25
let pixelToFeetRatio = null

let isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768

function updateCursorStyle(img, isDragging) {
  if (!isMobile) {
    img.style.cursor = isDragging ? 'none' : 'crosshair'
    document.body.style.cursor = isDragging ? 'none' : 'crosshair'
  }
}

function addDraggableImage(imageSrc, event, isMobileInit = false) {
  const img = document.createElement('img')
  img.style.opacity = '0'
  img.src = imageSrc
  img.classList.add('draggable')
  img.id = `${imageSrc.split('.')[0]}_${Date.now()}`

  if (imageSrc === 'forklift.png') {
    img.classList.add('forklift-image')
    img.dataset.scaleMultiplier = 1
    img.style.zIndex = Z_INDEX_LAYERS.FORKLIFT
  } else if (imageSrc === 'truck_side.png' || imageSrc === 'truck_side2.png') {
    img.classList.add('truck-image')
    img.dataset.scaleMultiplier = 6.75
    img.style.zIndex = Z_INDEX_LAYERS.TRUCK
  } else if (imageSrc === 'stuff.png') {
    img.classList.add('stuff-image')
    img.dataset.scaleMultiplier = 1
    img.style.zIndex = Z_INDEX_LAYERS.STUFF
  } else if (imageSrc === 'Slipbot.png' || imageSrc === 'SlipBot_Loaded.png') {
    img.classList.add('bot-image')
    img.dataset.scaleMultiplier =
      imageSrc === 'SlipBot_Loaded.png' ? 0.9 : 1
    img.style.zIndex = Z_INDEX_LAYERS.BOT
  }

  img.style.position = 'absolute'

  if (!isMobileInit) {
    const x = event.clientX || window.innerWidth / 2
    const y = event.clientY || window.innerHeight / 2
    img.style.left = `${x}px`
    img.style.top = `${y + 70}px`
  } else {
    img.style.left = `${window.innerWidth / 2}px`
    img.style.top = `${window.innerHeight / 2}px`
  }

  img.style.transformOrigin = 'center'
  img.style.willChange = 'transform'

  img.onerror = function() {
    console.error(`Failed to load image: ${imageSrc}`)
  }

  img.onload = function() {
    const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1
    img.style.width = `${img.naturalWidth * objectScale * multiplier}px`
    img.style.height = `${img.naturalHeight * objectScale * multiplier}px`
    img.style.opacity = '1'
    if (imageSrc === 'Slipbot.png' && pixelToFeetRatio === null) {
      pixelToFeetRatio =
        17 / (img.naturalHeight * objectScale * multiplier)
    }
  }

  const state = {
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    rotateDeg: 0,
    isLoaded: imageSrc === 'SlipBot_Loaded.png',
    group: null
  }

  if (!isMobile) {
    img.addEventListener('click', function(e) {
      e.stopPropagation()
      const el = Array.from(draggableElements).find(el => el.img === img)
      if (el && el.isDragging) {
        el.isDragging = false
        document.removeEventListener('mousemove', el.moveHandler)
        document.removeEventListener('mouseup', el.upHandler)
        updateCursorStyle(img, false)
      }
    })

    img.addEventListener('wheel', function(e) {
      e.preventDefault()
      e.stopPropagation()
      const delta = Math.sign(e.deltaY) * 7.5
      state.rotateDeg += delta
      const target = state.group || img
      rotateElement(target, state.rotateDeg)
    })
  }

  draggableElements.add({
    img,
    isDragging: false,
    state,
    moveHandler: null,
    upHandler: null
  })

  document.body.appendChild(img)
  return img
}

function updateZIndex(element) {
  if (!isMobile) {
    if (element.src) {
      if (element.src.includes('truck_side'))
        element.style.zIndex = Z_INDEX_LAYERS.TRUCK
      else if (element.src.includes('forklift'))
        element.style.zIndex = Z_INDEX_LAYERS.FORKLIFT
      else if (element.src.includes('Slipbot'))
        element.style.zIndex = Z_INDEX_LAYERS.BOT
      else if (element.src.includes('stuff'))
        element.style.zIndex = Z_INDEX_LAYERS.STUFF
    } else {
      element.style.zIndex = element.dataset.transportable
        ? Z_INDEX_LAYERS.TRANSPORTABLE_SQUARE
        : Z_INDEX_LAYERS.SQUARE
    }
    maxZIndex = Math.max(maxZIndex, parseInt(element.style.zIndex))
  }
}

function rotateElement(element, degrees) {
  const center = getCenter(element)
  element.style.transition = 'transform 0.1s ease'
  element.style.transform = `rotate(${degrees}deg)`
  const newCenter = getCenter(element)
  const dx = newCenter.x - center.x
  const dy = newCenter.y - center.y
  const currentLeft = parseFloat(element.style.left) || 0
  const currentTop = parseFloat(element.style.top) || 0
  element.style.left = `${currentLeft - dx}px`
  element.style.top = `${currentTop - dy}px`
}

let backgroundImage = null

document.addEventListener('DOMContentLoaded', function() {
  if (isMobile) {
    document.getElementById('mobile-message').style.display = 'flex'
    const event = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
    addDraggableImage('Slipbot.png', event, true)
  } else {
    document.getElementById('helpBtn').addEventListener('click', () => {
      const existing = document.querySelector('.help-overlay')
      if (existing) existing.remove()

      const helpText = `
Here's how to use it:
- Upload a background by pressing button and choosing image
- Add a bot for use in scaling set-up
- Toggle Scale 'On' and use mouse wheel to scale bot to image
- Add more bots, etc. w/ buttons
- Click and drag to move things around
- Use the mouse wheel to rotate
- Double-click to remove items
- Right-click Truck to turn around
- Right-click Bot to load and unload
`.trim()

      const overlay = document.createElement('div')
      overlay.className = 'help-overlay'
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.background = 'rgba(0,0,0,0.35)'
      overlay.style.zIndex = '9999'

      const popup = document.createElement('div')
      popup.style.position = 'absolute'
      popup.style.top = '50%'
      popup.style.left = '50%'
      popup.style.transform = 'translate(-50%, -50%)'
      popup.style.background = '#fff'
      popup.style.padding = '16px 20px'
      popup.style.borderRadius = '8px'
      popup.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'
      popup.style.maxWidth = 'min(600px, 90vw)'
      popup.style.width = 'fit-content'
      popup.style.maxHeight = '80vh'
      popup.style.overflow = 'auto'

      const title = document.createElement('h3')
      title.textContent = 'SlipBot Simulator Guide'
      title.style.margin = '0 32px 12px 0'
      title.style.fontSize = '16px'

      const closeBtn = document.createElement('button')
      closeBtn.type = 'button'
      closeBtn.textContent = '×'
      closeBtn.style.position = 'absolute'
      closeBtn.style.top = '8px'
      closeBtn.style.right = '10px'
      closeBtn.style.border = 'none'
      closeBtn.style.background = 'transparent'
      closeBtn.style.fontSize = '22px'
      closeBtn.style.cursor = 'pointer'

      const body = document.createElement('div')
      body.style.whiteSpace = 'pre-wrap'
      body.style.fontFamily = 'monospace'
      body.style.fontSize = '13px'
      body.textContent = helpText

      popup.appendChild(title)
      popup.appendChild(closeBtn)
      popup.appendChild(body)
      overlay.appendChild(popup)
      document.body.appendChild(overlay)

      function close() {
        overlay.remove()
        document.removeEventListener('keydown', onKey)
      }
      function onKey(e) {
        if (e.key === 'Escape') close()
      }

      closeBtn.addEventListener('click', close)
      overlay.addEventListener('click', e => { if (e.target === overlay) close() })
      document.addEventListener('keydown', onKey)
    })
  }
})
