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

let draggableElements = new Set();

function updateCursorStyle(img, isDragging) {
    img.style.cursor = isDragging ? 'none' : 'crosshair';
    document.body.style.cursor = isDragging ? 'none' : 'auto';
}

function toggleDragging(img, state, onMouseMove, onMouseUp) {
    const el = Array.from(draggableElements).find(el => el.img === img);
    if (el) {
        el.isDragging = !el.isDragging;
        if (el.isDragging) {
            state.offsetX = event.clientX - parseFloat(img.style.left);
            state.offsetY = event.clientY - parseFloat(img.style.top);
            state.lastX = event.clientX;
            state.lastY = event.clientY;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        updateCursorStyle(img, el.isDragging);
    }
}

function addDraggableImage(imageSrc, event) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.classList.add('draggable');
    img.style.position = 'absolute';
    
    const simulatorArea = document.getElementById('simulator-area');
    const rect = simulatorArea.getBoundingClientRect();
    
    img.style.left = `${event.clientX - rect.left}px`;
    img.style.top = `${event.clientY - rect.top}px`;
    
    img.style.transformOrigin = 'center';
    simulatorArea.appendChild(img);

    let isDragging = imageSrc === 'Slipbot.png', 
        rotateDeg = 0,
        isImageLoaded = false;

    const state = {
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0
    };

    img.onload = function() {
        if (imageSrc === 'truck_side.png') {
            img.style.width = `auto`;
            img.style.height = '${this.width}px';
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
        el.style.transform = `rotate(${angle}deg)`;
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
        if (imageSrc === 'truck_side.png') {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    draggableElements.add({ img, isDragging, state, onMouseMove, onMouseUp });

    img.style.cursor = 'crosshair';  

    if (imageSrc === 'Slipbot.png') {
        state.offsetX = event.clientX - parseFloat(img.style.left);
        state.offsetY = event.clientY - parseFloat(img.style.top);
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        img.addEventListener('click', function(e) {
            toggleDragging(img, state, onMouseMove, onMouseUp);
        });

        img.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -15 : 15; 
            rotateDeg = (rotateDeg + delta + 360) % 360;
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
    } else if (imageSrc === 'truck_side.png') {
        img.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            isDragging = true;
            updateCursorStyle(img, isDragging);
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

        img.addEventListener('mouseup', function() {
            isDragging = false;
            updateCursorStyle(img, isDragging);
        });

        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (isDragging) {
                if (img.src.includes('truck_side.png')) {
                    img.src = 'truck_side2.png';
                } else {
                    img.src = 'truck_side.png';
                }
            }
        });
    }
}


document.getElementById('addBotBtn').addEventListener('click', function(e) {
    addDraggableImage('Slipbot.png', e);
});

document.getElementById('addtrlrBtn').addEventListener('click', function(e) {
    addDraggableImage('truck_side.png', e);
});

let backgroundImages = [];          
let selectedBackground = null;

let backgroundImage = null;
let backgroundScale = 1;
let isDraggingBackground = false;
let lastMouseX, lastMouseY;

function addBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (backgroundImage) {
            backgroundImage.remove();
        }
        backgroundImage = document.createElement('img');
        backgroundImage.src = e.target.result;
        backgroundImage.classList.add('background-image');
        backgroundImage.style.transform = `translate(-50%, -50%) scale(${backgroundScale})`;
        document.getElementById('simulator-area').appendChild(backgroundImage);
        makeBackgroundDraggable(backgroundImage);
    };
    reader.readAsDataURL(file);
}

function makeBackgroundDraggable(img) {
    img.addEventListener('mousedown', startDraggingBackground);
    document.addEventListener('mousemove', dragBackground);
    document.addEventListener('mouseup', stopDraggingBackground);
}

function startDraggingBackground(e) {
    if (document.getElementById('backgroundToggle').checked) {
        isDraggingBackground = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.preventDefault();
    }
}

function dragBackground(e) {
    if (isDraggingBackground && document.getElementById('backgroundToggle').checked) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        const currentTransform = new DOMMatrix(backgroundImage.style.transform);
        const newX = currentTransform.e + dx;
        const newY = currentTransform.f + dy;
        backgroundImage.style.transform = `translate(${newX}px, ${newY}px) scale(${backgroundScale})`;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}

function stopDraggingBackground() {
    isDraggingBackground = false;
}

document.getElementById('backgroundUpload').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        addBackgroundImage(e.target.files[0]);
    }
});

document.getElementById('simulator-area').addEventListener('wheel', function(e) {
    if (backgroundImage && document.getElementById('backgroundToggle').checked) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        backgroundScale *= delta;
        backgroundScale = Math.max(0.1, Math.min(5, backgroundScale)); // Limit scale between 0.1 and 5
        const currentTransform = new DOMMatrix(backgroundImage.style.transform);
        backgroundImage.style.transform = `translate(${currentTransform.e}px, ${currentTransform.f}px) scale(${backgroundScale})`;
    }
});

document.getElementById('backgroundToggle').addEventListener('change', function(e) {
    if (backgroundImage) {
        backgroundImage.style.pointerEvents = e.target.checked ? 'auto' : 'none';
    }
});

document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('background-image')) {
        selectBackgroundImage(e.target);
    }
});

document.addEventListener('click', function(e) {
    const clickedOnDraggable = e.target.classList.contains('draggable');
    
    if (!clickedOnDraggable) {
        draggableElements.forEach(el => {
            if (el.isDragging) {
                toggleDragging(el.img, el.state, el.onMouseMove, el.onMouseUp);
            }
        });
    }
    document.body.style.cursor = 'crosshair';
});

document.body.style.cursor = 'crosshair';
