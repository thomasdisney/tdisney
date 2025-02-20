const getCenter = function(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = function(x, y, cx, cy, angle) {
    const radians = Math.PI / 180 * angle,
          cos = Math.cos(radians),
          sin = Math.sin(radians),
          nx = cos * (x - cx) + sin * (y - cy) + cx,
          ny = cos * (y - cy) - sin * (x - cx) + cy;
    return { x: nx, y: ny };
};

const checkOverlap = function(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect(),
          rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
};

let draggableElements = new Set();
let maxZIndex = 1;
let objectScale = 0.25;

const Z_INDEX_LAYERS = {
    TRUCK: 10,
    FORKLIFT: 20,
    BOT: 30,
    STUFF: 40
};

function updateCursorStyle(img, isDragging) {
    img.style.cursor = isDragging ? 'none' : 'crosshair';
    document.body.style.cursor = isDragging ? 'none' : 'crosshair';
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
    } else if (imageSrc === 'truck_side.png' || imageSrc === 'truck_side2.png') {
        img.classList.add('truck-image');
        img.dataset.scaleMultiplier = 10; 
    } else if (imageSrc === 'stuff.png') {
        img.classList.add('stuff-image');
    } else if (imageSrc === 'Slipbot.png' || imageSrc === 'SlipBot_Loaded.png') {
        img.classList.add('bot-image');
        if (imageSrc === 'SlipBot_Loaded.png') {
            img.dataset.scaleMultiplier = 0.12;
        }
    }
    const yOffset = 100;
    img.style.position = 'absolute';
    img.style.left = `${event.clientX}px`;
    img.style.top = `${yOffset}px`;
    img.style.transformOrigin = 'center';
    img.onload = function() {
        const multiplier = img.dataset.scaleMultiplier ? parseFloat(img.dataset.scaleMultiplier) : 1;
        img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
        img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
        img.style.opacity = '1';
    };
    const state = {
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        rotateDeg: 0,
        isImageLoaded: false
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
        const delta = e.deltaY > 0 ? -7.5 : 7.5;
        state.rotateDeg = (state.rotateDeg + delta + 360) % 360;
        rotateElement(img, state.rotateDeg);
    });
    if (imageSrc === 'Slipbot.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (!state.isImageLoaded) {
                img.src = 'SlipBot_Loaded.png';
                state.isImageLoaded = true;
                img.onload = function() {
                    const multiplier = img.dataset.scaleMultiplier ? parseFloat(img.dataset.scaleMultiplier) : 1;
                    img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
                    img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
                };
            } else {
                img.src = 'Slipbot.png';
                state.isImageLoaded = false;
                img.onload = function() {
                    img.style.width = `${img.naturalWidth * objectScale}px`;
                    img.style.height = `${img.naturalHeight * objectScale}px`;
                };
            }
        });
    }
    img.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        updateZIndex(img);
        const el = Array.from(draggableElements).find(el => el.img === img);
        if (el) {
            el.isDragging = true;
            el.state.offsetX = e.clientX - parseFloat(img.style.left);
            el.state.offsetY = e.clientY - parseFloat(img.style.top);
            if (img.src.includes('truck_side')) {
                handleAttachments(img);
            }
            const moveHandler = function(moveEvent) {
                if (el.isDragging) {
                    const newX = moveEvent.clientX - el.state.offsetX;
                    const newY = moveEvent.clientY - el.state.offsetY;
                    el.img.style.left = `${newX}px`;
                    el.img.style.top = `${newY}px`;
                    if (img.src.includes('truck_side')) {
                        draggableElements.forEach(attachedEl => {
                            if (attachedEl.img.dataset.attachedTo === img.id) {
                                const relX = parseFloat(attachedEl.img.dataset.relativeX);
                                const relY = parseFloat(attachedEl.img.dataset.relativeY);
                                attachedEl.img.style.left = `${newX + relX}px`;
                                attachedEl.img.style.top = `${newY + relY}px`;
                            }
                        });
                    }
                }
            };
            const upHandler = function() {
                el.isDragging = false;
                updateCursorStyle(el.img, false);
                draggableElements.forEach(el => {
                    delete el.img.dataset.relativeX;
                    delete el.img.dataset.relativeY;
                    delete el.img.dataset.attachedTo;
                });
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        }
        updateCursorStyle(img, true);
    });
    img.addEventListener('mouseup', function() {
        isDragging = false;
        updateCursorStyle(img, isDragging);
    });
    img.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY });
        img.dispatchEvent(mouseEvent);
    });
    img.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY });
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
    draggableElements.add({ img, isDragging: false, state });
    if (imageSrc === 'truck_side.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const currentLeft = parseInt(img.style.left);
            const currentSrc = img.src;
            if (currentSrc.endsWith('truck_side.png')) {
                img.style.left = currentLeft - 60 + 'px';
                img.src = 'truck_side2.png';
            } else {
                img.style.left = currentLeft + 60 + 'px';
                img.src = 'truck_side.png';
            }
            img.onload = function() {
                const multiplier = img.dataset.scaleMultiplier ? parseFloat(img.dataset.scaleMultiplier) : 1;
                img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
                img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
            };
        });
    }
    return img;
}

function updateZIndex(img) {
    let baseZ;
    if (img.src.includes('truck_side')) {
        baseZ = Z_INDEX_LAYERS.TRUCK;
    } else if (img.src.includes('forklift') || img.src.includes('stuff')) {
        baseZ = Z_INDEX_LAYERS.FORKLIFT;
    } else if (img.src.includes('stuff')) {
        baseZ = Z_INDEX_LAYERS.STUFF;
    } else if (img.src.includes('Slipbot')) {
        baseZ = Z_INDEX_LAYERS.BOT;
    }
    img.style.zIndex = baseZ;
    maxZIndex = Math.max(maxZIndex, baseZ);
}

function rotateElement(element, degrees) {
    const center = getCenter(element);
    element.style.transform = `rotate(${degrees}deg)`;
    const newCenter = getCenter(element);
    const dx = newCenter.x - center.x;
    const dy = newCenter.y - center.y;
    const currentLeft = parseFloat(element.style.left) || 0;
    const currentTop = parseFloat(element.style.top) || 0;
    element.style.left = `${currentLeft - dx}px`;
    element.style.top = `${currentTop - dy}px`;
}

function onMouseMove(e) {
    const el = Array.from(draggableElements).find(el => el.isDragging);
    if (el) {
        const newX = e.clientX - el.state.offsetX;
        const newY = e.clientY - el.state.offsetY;
        el.img.style.left = `${newX}px`;
        el.img.style.top = `${newY}px`;
    }
}

function onMouseUp() {
    const el = Array.from(draggableElements).find(el => el.isDragging);
    if (el) {
        el.isDragging = false;
        updateCursorStyle(el.img, false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

let backgroundImage = null;

document.getElementById('backgroundUpload').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        addBackgroundImage(e.target.files[0]);
    }
});

document.body.addEventListener('wheel', function(e) {
    e.preventDefault();
    const toggle = document.getElementById('backgroundToggle').checked;
    if (toggle) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        objectScale *= delta;
        objectScale = Math.max(0.1, Math.min(5, objectScale));

        draggableElements.forEach(el => {
            const img = el.img;
            const multiplier = img.dataset.scaleMultiplier ? parseFloat(img.dataset.scaleMultiplier) : 1;
            const currentWidth = img.naturalWidth * objectScale * multiplier;
            const currentHeight = img.naturalHeight * objectScale * multiplier;
            const centerBefore = getCenter(img);
            img.style.width = `${currentWidth}px`;
            img.style.height = `${currentHeight}px`;
            const centerAfter = getCenter(img);
            const dx = centerAfter.x - centerBefore.x;
            const dy = centerAfter.y - centerBefore.y;
            img.style.left = `${parseFloat(img.style.left) - dx}px`;
            img.style.top = `${parseFloat(img.style.top) - dy}px`;
        });
    }
});

let backgroundToggle = document.getElementById('backgroundToggle');
backgroundToggle.addEventListener('change', function(e) {
    if (backgroundImage) {
        if (e.target.checked) {
            backgroundImage.style.zIndex = '1';
        } else {
            backgroundImage.style.zIndex = '-1';
        }
    }
});

document.addEventListener('click', function(e) {
    const clickedOnDraggable = e.target.classList.contains('draggable');
    if (!clickedOnDraggable) {
        draggableElements.forEach(el => {
            if (el.isDragging) {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
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
            backgroundImage.remove();
        }
        backgroundImage = document.createElement('img');
        backgroundImage.src = e.target.result;
        backgroundImage.classList.add('background-image');
        backgroundImage.style.maxWidth = '100vw';
        backgroundImage.style.maxHeight = 'calc(100vh - 60px)';
        backgroundImage.style.width = 'auto';
        backgroundImage.style.height = 'auto';
        backgroundImage.style.position = 'absolute';
        backgroundImage.style.left = '50%';
        backgroundImage.style.top = '60px';
        backgroundImage.style.transform = 'translate(-50%, 0)';
        backgroundImage.style.opacity = '0';
        backgroundImage.style.pointerEvents = 'none';
        document.body.appendChild(backgroundImage);
        backgroundImage.onload = function() {
            backgroundImage.style.transition = 'opacity 0.3s ease';
            backgroundImage.style.opacity = '1';
            backgroundImage.style.zIndex = document.getElementById('backgroundToggle').checked ? '1' : '-1';
        };
    };
    reader.readAsDataURL(file);
}

document.getElementById('addBotBtn').addEventListener('click', e => document.body.appendChild(addDraggableImage('Slipbot.png', e)));
document.getElementById('addtrlrBtn').addEventListener('click', e => document.body.appendChild(addDraggableImage('truck_side.png', e)));
document.getElementById('addForkliftBtn').addEventListener('click', e => document.body.appendChild(addDraggableImage('forklift.png', e)));

function handleAttachments(movingElement) {
    if (!movingElement.src.includes('truck_side')) {
        return;
    }
    draggableElements.forEach(el => {
        delete el.img.dataset.relativeX;
        delete el.img.dataset.relativeY;
        delete el.img.dataset.attachedTo;
    });
    draggableElements.forEach(el => {
        if (el.img !== movingElement && parseInt(el.img.style.zIndex) > parseInt(movingElement.style.zIndex)) {
            if (checkOverlap(movingElement, el.img)) {
                const relX = parseFloat(el.img.style.left) - parseFloat(movingElement.style.left);
                const relY = parseFloat(el.img.style.top) - parseFloat(movingElement.style.top);
                el.img.dataset.relativeX = relX;
                el.img.dataset.relativeY = relY;
                el.img.dataset.attachedTo = movingElement.id;
            }
        }
    });
}

document.getElementById('addStuffBtn').addEventListener('click', e => document.body.appendChild(addDraggableImage('stuff.png', e)));

document.getElementById('helpBtn').addEventListener('click', () => {
    const helpText = `
        <h2>Robot Simulator Help</h2>
        <p>Welcome to the Robot Simulator! Here's how to use it:</p>
        <ul>
            <li><strong>Add Elements:</strong> Use the buttons to add trucks, forklifts, bots, or stuff.</li>
            <li><strong>Move:</strong> Click and drag any element to move it.</li>
            <li><strong>Rotate:</strong> Use the mouse wheel to rotate elements.</li>
            <li><strong>Scale:</strong> Enable the background toggle and scroll to scale all elements.</li>
            <li><strong>Delete:</strong> Double-click an element to remove it.</li>
            <li><strong>Special Actions:</strong>
                <ul>
                    <li><strong>Truck:</strong> Right-click to switch between side views.</li>
                    <li><strong>Bot:</strong> Right-click to toggle between loaded and unloaded states.</li>
                </ul>
            </li>
            <li><strong>Background:</strong> Upload a background image and toggle its layer with the checkbox.</li>
        </ul>
    `;
    alert(helpText.replace(/<[^>]+>/g, ''));
});
