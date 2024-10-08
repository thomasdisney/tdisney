const getCenter = (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = (x, y, cx, cy, angle) => {
    const radians = (Math.PI / 180) * angle,
          cos = Math.cos(radians),
          sin = Math.sin(radians),
          nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
          ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return { x: nx, y: ny };
};

const checkOverlap = (elem1, elem2) => {
    const rect1 = elem1.getBoundingClientRect(),
          rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || rect1.left > rect2.right ||
             rect1.bottom < rect2.top || rect1.top > rect2.bottom);
};

let draggableImages = [];

function addDraggableImage(imageSrc, event) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.classList.add('draggable');
    img.style.position = 'absolute';
    img.style.left = `${event.clientX}px`;
    img.style.top = `${event.clientY}px`;
    img.style.transformOrigin = 'center';
    document.body.appendChild(img);

    let isDragging = true, 
        rotateDeg = 0,
        isImageLoaded = false,
        isMirrored = false;

    const state = {
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0
    };

    img.onload = function() {
        if (imageSrc === 'truck.png') {
            img.style.width = `${this.width}px`;
            img.style.height = 'auto';
        } else {
            img.style.width = '40px';
            img.style.height = 'auto';
        }
    };

    let attachedElements = new Set();

    function updateAttachedElements(rootEl) {
        attachedElements.clear();
        document.querySelectorAll('img.draggable').forEach(el => {
            if (el !== rootEl && checkOverlap(rootEl, el)) {
                attachedElements.add(el);
            }
        });
    }

    function moveElement(el, dx, dy) {
        const left = parseFloat(el.style.left) + dx;
        const top = parseFloat(el.style.top) + dy;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }

    function rotateElement(el, angle) {
        el.style.transform = `rotate(${angle}deg) scaleY(${isMirrored ? -1 : 1})`;
    }

    function mirrorElement(el) {
        isMirrored = !isMirrored;
        el.style.transform = `rotate(${rotateDeg}deg) scaleY(${isMirrored ? -1 : 1})`;
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - state.lastX;
        const dy = e.clientY - state.lastY;

        moveElement(img, dx, dy);
        attachedElements.forEach(el => moveElement(el, dx, dy));

        state.lastX = e.clientX;
        state.lastY = e.clientY;
    }

    function onMouseUp() {
        if (imageSrc === 'truck.png') {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    if (imageSrc === 'Slipbot.png') {
        state.offsetX = event.clientX - parseFloat(img.style.left);
        state.offsetY = event.clientY - parseFloat(img.style.top);
        state.lastX = event.clientX;
        state.lastY = event.clientY;

        img.addEventListener('click', function(e) {
            isDragging = !isDragging;
            if (isDragging) {
                state.offsetX = e.clientX - parseFloat(img.style.left);
                state.offsetY = e.clientY - parseFloat(img.style.top);
                state.lastX = e.clientX;
                state.lastY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
            } else {
                document.removeEventListener('mousemove', onMouseMove);
            }
            e.stopPropagation();
        });

        img.addEventListener('dblclick', function(e) {
            e.preventDefault();
            rotateDeg = (rotateDeg + 45) % 360;
            rotateElement(img, rotateDeg);
        });

        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (!isImageLoaded) {
                img.src = 'SlipBot_Loaded.png';
                isImageLoaded = true;
            } else {
                img.src = 'Slipbot.png';
                isImageLoaded = false;
            }
        });
    } else if (imageSrc === 'truck.png') {
        img.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            isDragging = true;
            state.offsetX = e.clientX - parseFloat(img.style.left);
            state.offsetY = e.clientY - parseFloat(img.style.top);
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.lastX = e.clientX;
            state.lastY = e.clientY;
            updateAttachedElements(img);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        img.addEventListener('dblclick', function(e) {
            e.preventDefault();
            mirrorElement(img);
            const center = getCenter(img);
            attachedElements.forEach(el => {
                const elCenter = getCenter(el);
                const mirrored = { 
                    x: elCenter.x, 
                    y: 2 * center.y - elCenter.y 
                };
                el.style.left = `${mirrored.x - el.offsetWidth / 2}px`;
                el.style.top = `${mirrored.y - el.offsetHeight / 2}px`;
                mirrorElement(el);
            });
        });

        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const prevRotateDeg = rotateDeg;
            rotateDeg = (rotateDeg + 45) % 360;
            const deltaRotate = rotateDeg - prevRotateDeg;
            
            rotateElement(img, rotateDeg);
            
            const center = getCenter(img);
            attachedElements.forEach(el => {
                const elCenter = getCenter(el);
                const rotated = rotatePoint(elCenter.x, elCenter.y, center.x, center.y, deltaRotate);
                el.style.left = `${rotated.x - el.offsetWidth / 2}px`;
                el.style.top = `${rotated.y - el.offsetHeight / 2}px`;
                rotateElement(el, rotateDeg);
            });
        });
    }

    draggableImages.push({ img, isDragging: () => isDragging, setDragging: (value) => isDragging = value });
}

// Add a click event listener to the document body
document.body.addEventListener('click', function(e) {
    // Check if the click is not on a draggable image
    if (!e.target.classList.contains('draggable')) {
        // Set isDragging to false for all draggable images
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
