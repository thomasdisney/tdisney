// Utility functions
const getCenter = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = (x, y, cx, cy, angle) => {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return { x: nx, y: ny };
};

const checkOverlap = (elem1, elem2) => {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || rect1.left > rect2.right ||
             rect1.bottom < rect2.top || rect1.top > rect2.bottom);
};

// Image management
let draggableImages = [];

function addDraggableImage(imageSrc, event) {
    const img = createImageElement(imageSrc, event);
    const state = initializeState(event, img);
    const attachedElements = new Set();

    img.onload = () => adjustImageSize(img, imageSrc);

    setupImageEventListeners(img, imageSrc, state, attachedElements);
    draggableImages.push({ img, isDragging: () => state.isDragging, setDragging: (value) => state.isDragging = value });
}

function createImageElement(imageSrc, event) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.classList.add('draggable');
    img.style.position = 'absolute';
    img.style.left = `${event.clientX}px`;
    img.style.top = `${event.clientY}px`;
    img.style.transformOrigin = 'center';
    document.body.appendChild(img);
    return img;
}

function initializeState(event, img) {
    return {
        isDragging: true,
        rotateDeg: 0,
        isImageLoaded: false,
        isMirrored: false,
        offsetX: event.clientX - parseFloat(img.style.left),
        offsetY: event.clientY - parseFloat(img.style.top),
        lastX: event.clientX,
        lastY: event.clientY
    };
}

function adjustImageSize(img, imageSrc) {
    if (imageSrc === 'truck.png') {
        img.style.width = `${img.width}px`;
        img.style.height = 'auto';
    } else {
        img.style.width = '40px';
        img.style.height = 'auto';
    }
}

function setupImageEventListeners(img, imageSrc, state, attachedElements) {
    if (imageSrc === 'Slipbot.png') {
        setupSlipbotEventListeners(img, state);
    } else if (imageSrc === 'truck.png') {
        setupTruckEventListeners(img, state, attachedElements);
    }
}

function setupSlipbotEventListeners(img, state) {
    img.addEventListener('click', (e) => toggleDragging(e, state, img));
    img.addEventListener('dblclick', (e) => rotateImage(e, state, img));
    img.addEventListener('contextmenu', (e) => toggleImageSource(e, state, img));
}

function setupTruckEventListeners(img, state, attachedElements) {
    img.addEventListener('mousedown', (e) => startDragging(e, state, img, attachedElements));
    img.addEventListener('dblclick', (e) => mirrorImage(e, state, img, attachedElements));
    img.addEventListener('contextmenu', (e) => rotateAttachedImages(e, state, img, attachedElements));
}

function toggleDragging(e, state, img) {
    state.isDragging = !state.isDragging;
    if (state.isDragging) {
        state.offsetX = e.clientX - parseFloat(img.style.left);
        state.offsetY = e.clientY - parseFloat(img.style.top);
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        document.addEventListener('mousemove', (e) => onMouseMove(e, state, img));
    } else {
        document.removeEventListener('mousemove', (e) => onMouseMove(e, state, img));
    }
    e.stopPropagation();
}

function rotateImage(e, state, img) {
    e.preventDefault();
    state.rotateDeg = (state.rotateDeg + 45) % 360;
    img.style.transform = `rotate(${state.rotateDeg}deg) scaleY(${state.isMirrored ? -1 : 1})`;
}

function toggleImageSource(e, state, img) {
    e.preventDefault();
    if (!state.isImageLoaded) {
        img.src = 'SlipBot_Loaded.png';
        state.isImageLoaded = true;
    } else {
        img.src = 'Slipbot.png';
        state.isImageLoaded = false;
    }
}

function startDragging(e, state, img, attachedElements) {
    if (e.button !== 0) return;
    state.isDragging = true;
    state.offsetX = e.clientX - parseFloat(img.style.left);
    state.offsetY = e.clientY - parseFloat(img.style.top);
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    updateAttachedElements(img, attachedElements);
    document.addEventListener('mousemove', (e) => onMouseMove(e, state, img));
    document.addEventListener('mouseup', () => stopDragging(state));
}

function mirrorImage(e, state, img, attachedElements) {
    e.preventDefault();
    state.isMirrored = !state.isMirrored;
    img.style.transform = `rotate(${state.rotateDeg}deg) scaleY(${state.isMirrored ? -1 : 1})`;
    const center = getCenter(img);
    attachedElements.forEach(el => {
        const elCenter = getCenter(el);
        const mirrored = { x: elCenter.x, y: 2 * center.y - elCenter.y };
        el.style.left = `${mirrored.x - el.offsetWidth / 2}px`;
        el.style.top = `${mirrored.y - el.offsetHeight / 2}px`;
        el.style.transform = `rotate(${state.rotateDeg}deg) scaleY(${state.isMirrored ? -1 : 1})`;
    });
}

function rotateAttachedImages(e, state, img, attachedElements) {
    e.preventDefault();
    const prevRotateDeg = state.rotateDeg;
    state.rotateDeg = (state.rotateDeg + 45) % 360;
    const deltaRotate = state.rotateDeg - prevRotateDeg;
    img.style.transform = `rotate(${state.rotateDeg}deg) scaleY(${state.isMirrored ? -1 : 1})`;
    const center = getCenter(img);
    attachedElements.forEach(el => {
        const elCenter = getCenter(el);
        const rotated = rotatePoint(elCenter.x, elCenter.y, center.x, center.y, deltaRotate);
        el.style.left = `${rotated.x - el.offsetWidth / 2}px`;
        el.style.top = `${rotated.y - el.offsetHeight / 2}px`;
        el.style.transform = `rotate(${state.rotateDeg}deg) scaleY(${state.isMirrored ? -1 : 1})`;
    });
}

document.body.addEventListener('click', function(e) {
    if (!e.target.classList.contains('draggable')) {
        draggableImages.forEach(item => item.setDragging(false));
    }
});
document.getElementById('addBotBtn').addEventListener('click',function(e){addDraggableImage('Slipbot.png',e)});
document.getElementById('addtrlrBtn').addEventListener('click',function(e){addDraggableImage('truck.png',e)});
let backgroundImages=[];let selectedBackground=null;
function addBackgroundImage(file){const reader=new FileReader();reader.onload=function(e){const img=document.createElement('img');img.src=e.target.result;img.classList.add('background-image');img.style.display='block';img.dataset.scale=1;img.dataset.rotation=0;document.body.appendChild(img);backgroundImages.push(img);selectBackgroundImage(img);makeBackgroundDraggable(img)};reader.readAsDataURL(file)}
function makeBackgroundDraggable(img){let isDragging=false;let startX,startY,startLeft,startTop;img.addEventListener('mousedown',function(e){if(document.getElementById('backgroundToggle').checked){isDragging=true;startX=e.clientX;startY=e.clientY;startLeft=img.offsetLeft;startTop=img.offsetTop;e.preventDefault()}});document.addEventListener('mousemove',function(e){if(isDragging&&document.getElementById('backgroundToggle').checked){const dx=e.clientX-startX;const dy=e.clientY-startY;img.style.left=`${startLeft+dx}px`;img.style.top=`${startTop+dy}px`}});document.addEventListener('mouseup',function(){isDragging=false});img.addEventListener('dblclick',function(e){if(document.getElementById('backgroundToggle').checked){const currentRotation=parseInt(img.dataset.rotation)||0;const newRotation=(currentRotation+90)%360;img.style.transform=`translate(-50%, -50%) scale(${img.dataset.scale}) rotate(${newRotation}deg)`;img.dataset.rotation=newRotation;e.preventDefault()}})}
function selectBackgroundImage(img){if(selectedBackground){selectedBackground.classList.remove('selected')}selectedBackground=img;selectedBackground.classList.add('selected');document.getElementById('scaleBackground').value=selectedBackground.dataset.scale*100}
document.getElementById('backgroundUpload').addEventListener('change',function(e){const files=e.target.files;for(let i=0;i<files.length;i++){addBackgroundImage(files[i])}});
document.getElementById('scaleBackground').addEventListener('input',function(e){if(selectedBackground&&document.getElementById('backgroundToggle').checked){const scale=e.target.value/100;selectedBackground.dataset.scale=scale;const rotation=selectedBackground.dataset.rotation||0;selectedBackground.style.transform=`translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`}});