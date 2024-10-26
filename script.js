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

const Z_INDEX_LAYERS = {
    TRUCK: 10,
    FORKLIFT: 20,
    BOT: 30
};

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
    
    // Set initial position - adjust the Y offset (400 pushes it lower)
    const yOffset = 100; // This will position it 100px from top
    img.style.position = 'absolute';    
    img.style.left = `${event.clientX}px`;
    img.style.top = `${yOffset}px`;  // Use absolute position from top
    img.style.transformOrigin = 'center';
    
    img.onload = function() {
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
        const delta = e.deltaY > 0 ? -15 : 15; 
        state.rotateDeg = (state.rotateDeg + delta + 360) % 360;
        rotateElement(img, state.rotateDeg);
    });
    if (imageSrc === 'Slipbot.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (!state.isImageLoaded) {
                img.src = 'SlipBot_Loaded.png';
                state.isImageLoaded = true;
            } else {
                img.src = 'Slipbot.png';
                state.isImageLoaded = false;
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
            
            // Only check for attachments if this is a truck
            if (img.src.includes('truck_side')) {
                handleAttachments(img);
            }
            
            const moveHandler = (moveEvent) => {
                if (el.isDragging) {
                    const newX = moveEvent.clientX - el.state.offsetX;
                    const newY = moveEvent.clientY - el.state.offsetY;
                    el.img.style.left = `${newX}px`;
                    el.img.style.top = `${newY}px`;

                    // Only move attached elements if this is a truck
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
            
            const upHandler = () => {
                el.isDragging = false;
                updateCursorStyle(el.img, false);
                
                // Clear all attachments when dragging stops
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

    draggableElements.add({
        img,
        isDragging: false,
        state
    });

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
    let baseZ;
    if (img.src.includes('truck_side')) {
        baseZ = Z_INDEX_LAYERS.TRUCK;
    } else if (img.src.includes('forklift')) {
        baseZ = Z_INDEX_LAYERS.FORKLIFT;
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
let backgroundScale = 1;
let isDraggingBackground = false;
let lastMouseX, lastMouseY;

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
        
        // Update stored position
        const currentX = parseFloat(backgroundImage.dataset.translateX || 0);
        const currentY = parseFloat(backgroundImage.dataset.translateY || 0);
        const newX = currentX + dx;
        const newY = currentY + dy;
        
        // Store new position
        backgroundImage.dataset.translateX = newX;
        backgroundImage.dataset.translateY = newY;
        
        // Apply transform with both translation and scale
        backgroundImage.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px)) scale(${backgroundScale})`;
        
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
        const target = e.target;
        if (target === backgroundImage || target === document.body) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            backgroundScale *= delta;
            backgroundScale = Math.max(0.1, Math.min(5, backgroundScale));
            
            // Keep current translation while updating scale
            const translateX = backgroundImage.dataset.translateX || 0;
            const translateY = backgroundImage.dataset.translateY || 0;
            backgroundImage.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${backgroundScale})`;
        }
    }
});

document.getElementById('backgroundToggle').addEventListener('change', function(e) {
    if (backgroundImage) {
        if (e.target.checked) {
            backgroundImage.style.pointerEvents = 'auto';
            makeBackgroundDraggable(backgroundImage);
        } else {
            backgroundImage.style.pointerEvents = 'none';
            isDraggingBackground = false;  // Stop any ongoing drag
            // Remove event listeners
            backgroundImage.removeEventListener('mousedown', startDraggingBackground);
            document.removeEventListener('mousemove', dragBackground);
            document.removeEventListener('mouseup', stopDraggingBackground);
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
            backgroundImage.removeEventListener('mousedown', startDraggingBackground);
            document.removeEventListener('mousemove', dragBackground);
            document.removeEventListener('mouseup', stopDraggingBackground);
            backgroundImage.remove();
        }
        backgroundImage = document.createElement('img');
        backgroundImage.src = e.target.result;
        backgroundImage.classList.add('background-image');
        // Start with centered position
        backgroundImage.style.transform = `translate(-50%, -50%) scale(${backgroundScale})`;
        backgroundImage.style.opacity = '0';
        document.body.appendChild(backgroundImage);
        
        // Track position separately from transform
        backgroundImage.dataset.translateX = '0';
        backgroundImage.dataset.translateY = '0';
        
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

function handleAttachments(movingElement) {
    // Only proceed if this is a truck
    if (!movingElement.src.includes('truck_side')) {
        return;
    }

    // Clear all existing attachments first
    draggableElements.forEach(el => {
        delete el.img.dataset.relativeX;
        delete el.img.dataset.relativeY;
        delete el.img.dataset.attachedTo;
    });

    // Find new overlapping elements with higher z-index
    draggableElements.forEach(el => {
        if (el.img !== movingElement && 
            parseInt(el.img.style.zIndex) > parseInt(movingElement.style.zIndex)) {
            
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

function makeBackgroundDraggable(img) {
    // Initialize transform values if they don't exist
    if (!img.style.transform) {
        img.style.transform = `translate(-50%, -50%) scale(${backgroundScale})`;
    }

    // Create bound event handlers to maintain context
    const boundStartDrag = (e) => {
        if (document.getElementById('backgroundToggle').checked) {
            isDraggingBackground = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            e.preventDefault();
            console.log('Started dragging background'); // Debug log
        }
    };

    const boundDrag = (e) => {
        if (isDraggingBackground && document.getElementById('backgroundToggle').checked) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            
            // Update stored position
            const currentX = parseFloat(backgroundImage.dataset.translateX || 0);
            const currentY = parseFloat(backgroundImage.dataset.translateY || 0);
            const newX = currentX + dx;
            const newY = currentY + dy;
            
            // Store new position
            backgroundImage.dataset.translateX = newX;
            backgroundImage.dataset.translateY = newY;
            
            // Apply transform
            backgroundImage.style.transform = `translate(calc(-50% + ${newX}px), calc(-50% + ${newY}px)) scale(${backgroundScale})`;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            console.log('Dragging background', newX, newY); // Debug log
        }
    };

    const boundStopDrag = () => {
        if (isDraggingBackground) {
            isDraggingBackground = false;
            console.log('Stopped dragging background'); // Debug log
        }
    };

    function updateEventListeners() {
        // Remove old listeners first
        img.removeEventListener('mousedown', boundStartDrag);
        document.removeEventListener('mousemove', boundDrag);
        document.removeEventListener('mouseup', boundStopDrag);

        if (document.getElementById('backgroundToggle').checked) {
            img.addEventListener('mousedown', boundStartDrag);
            document.addEventListener('mousemove', boundDrag);
            document.addEventListener('mouseup', boundStopDrag);
            img.style.pointerEvents = 'auto';
        } else {
            img.style.pointerEvents = 'none';
            isDraggingBackground = false;
        }
    }

    // Initial setup
    updateEventListeners();

    // Update listeners when toggle changes
    document.getElementById('backgroundToggle').addEventListener('change', updateEventListeners);
}
