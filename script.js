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
let maxZIndex = 1;

function updateCursorStyle(img, isDragging) {
    img.style.cursor = isDragging ? 'none' : 'crosshair';
    document.body.style.cursor = isDragging ? 'none' : 'auto';
}

function toggleDragging(img, state, onMouseMove, onMouseUp, e) {
    const el = Array.from(draggableElements).find(el => el.img === img);
    if (el) {
        el.isDragging = !el.isDragging;
        if (el.isDragging) {
            state.offsetX = e.clientX - parseFloat(img.style.left);
            state.offsetY = e.clientY - parseFloat(img.style.top);
            state.lastX = e.clientX;
            state.lastY = e.clientY;
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
    img.style.opacity = '0'; 
    img.src = imageSrc;
    img.classList.add('draggable');
    if (imageSrc === 'forklift.png') {
        img.classList.add('forklift-image');
    } else if (imageSrc === 'truckside.png' || imageSrc === 'truckside2.png') {
        img.classList.add('truck-image');
    } else if (imageSrc === 'Slipbot.png' || imageSrc === 'SlipBot_Loaded.png') {
        img.classList.add('bot-image');
    }
    img.style.position = 'absolute';    
    img.style.left = `${event.clientX}px`;
    img.style.top = `${event.clientY}px`;
    img.style.transformOrigin = 'center';
    
    img.onload = function() {
        img.style.opacity = '1'; 
    };
    
    let isDragging = false,
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
    
    img.addEventListener('click', function(e) {
        e.stopPropagation(); 
        if (isDragging) {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        updateCursorStyle(img, isDragging);
    });

    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -15 : 15; 
        rotateDeg = (rotateDeg + delta + 360) % 360;
        rotateElement(img, rotateDeg);
    });
    if (imageSrc === 'Slipbot.png') {
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
    }
    img.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        updateZIndex(img);
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

    img.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        img.dispatchEvent(mouseEvent);
    });

    img.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        document.dispatchEvent(mouseEvent);
    });

    img.addEventListener('touchend', function(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup');
        document.dispatchEvent(mouseEvent);
    });

    img.addEventListener('dblclick', function(e) {
        e.preventDefault();
        if (confirm('Delete this element?')) {
            draggableElements.delete(Array.from(draggableElements).find(el => el.img === img));
            img.remove();
        }
    });

    draggableElements.add({ img, isDragging, state, onMouseMove, onMouseUp });

    if (imageSrc === 'truck_side.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const currentLeft = parseInt(img.style.left);
            const currentSrc = img.src;
            
            if (currentSrc.endsWith('truck_side.png')) {
                img.style.left = (currentLeft - 60) + 'px';
                img.src = 'truck_side2.png';
            } else {
                img.style.left = (currentLeft + 60) + 'px';
                img.src = 'truck_side.png';
            }
        });
    }
    return img;
}

function updateAttachedElements(img) {
    return;
}

function updateZIndex(img) {
    maxZIndex++;
    img.style.zIndex = maxZIndex;
}

function rotateElement(element, degrees) {
    const center = getCenter(element);
    element.style.transform = `rotate(${degrees}deg)`;
    const newCenter = getCenter(element);
    const dx = newCenter.x - center.x;
    const dy = newCenter.y - center.y;
    element.style.left = `${parseFloat(element.style.left) - dx}px`;
    element.style.top = `${parseFloat(element.style.top) - dy}px`;
}

function onMouseMove(e) {
    const el = Array.from(draggableElements).find(el => el.isDragging);
    if (el) {
        const newX = e.clientX - el.state.offsetX;
        const newY = e.clientY - el.state.offsetY;
        el.img.style.left = `${newX}px`;
        el.img.style.top = `${newY}px`;
        el.state.lastX = e.clientX;
        el.state.lastY = e.clientY;
    }
}

function onMouseUp() {
    const el = Array.from(draggableElements).find(el => el.isDragging);
    if (el) {
        el.isDragging = false;
        updateCursorStyle(el.img, false);
        document.removeEventListener('mousemove', el.onMouseMove);
        document.removeEventListener('mouseup', el.onMouseUp);
    }
}

let backgroundImage = null;
let backgroundScale = 1;
let isDraggingBackground = false;
let lastMouseX, lastMouseY;

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

document.body.addEventListener('wheel', function(e) {
    if (backgroundImage && document.getElementById('backgroundToggle').checked) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        backgroundScale *= delta;
        backgroundScale = Math.max(0.1, Math.min(5, backgroundScale));
        const currentTransform = new DOMMatrix(backgroundImage.style.transform);
        backgroundImage.style.transform = `translate(${currentTransform.e}px, ${currentTransform.f}px) scale(${backgroundScale})`;
    }
});

document.getElementById('backgroundToggle').addEventListener('change', function(e) {
    if (backgroundImage) {
        backgroundImage.style.pointerEvents = e.target.checked ? 'auto' : 'none';
    }
});

document.addEventListener('click', function(e) {
    const clickedOnDraggable = e.target.classList.contains('draggable');
    
    if (!clickedOnDraggable) {
        draggableElements.forEach(el => {
            if (el.isDragging) {
                document.removeEventListener('mousemove', el.onMouseMove);
                document.removeEventListener('mouseup', el.onMouseUp);
                el.isDragging = false;
                updateCursorStyle(el.img, false);
            }
        });
    }
    document.body.style.cursor = 'crosshair';
});

document.addEventListener('mouseleave', function() {
    draggableElements.forEach(el => {
        if (el.isDragging) {
            document.removeEventListener('mousemove', el.onMouseMove);
            document.removeEventListener('mouseup', el.onMouseUp);
            el.isDragging = false;
            updateCursorStyle(el.img, false);
        }
    });
});

document.body.style.cursor = 'crosshair';

function addBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (backgroundImage) {
            backgroundImage.removeEventListener('mousedown', startDraggingBackground);
            document.removeEventListener('mousemove', dragBackground);
            document.removeEventListener('mouseup', stopDraggingBackground);
            backgroundImage.remove();
        }
        backgroundImage = document.createElement('img');
        backgroundImage.src = e.target.result;
        backgroundImage.classList.add('background-image');
        backgroundImage.style.transform = `translate(-50%, -50%) scale(${backgroundScale})`;
        backgroundImage.style.opacity = '0';
        document.body.appendChild(backgroundImage);
        
        backgroundImage.onload = function() {
            backgroundImage.style.transition = 'opacity 0.3s ease';
            backgroundImage.style.opacity = '1';
            makeBackgroundDraggable(backgroundImage);
        };
    };
    reader.readAsDataURL(file);
}

document.getElementById('addBotBtn').addEventListener('click', (e) => 
    document.body.appendChild(addDraggableImage('Slipbot.png', e))
);

document.getElementById('addtrlrBtn').addEventListener('click', (e) => 
    document.body.appendChild(addDraggableImage('truck_side.png', e))
);

document.getElementById('addForkliftBtn').addEventListener('click', (e) => 
    document.body.appendChild(addDraggableImage('forklift.png', e))
);
