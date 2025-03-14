const getCenter = function(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = function(x, y, cx, cy, angle) {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = cos * (x - cx) + sin * (y - cy) + cx;
    const ny = cos * (y - cy) - sin * (x - cx) + cy;
    return { x: nx, y: ny };
};

const checkOverlap = function(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
};

const Z_INDEX_LAYERS = {
    SQUARE: 5,
    TRUCK: 10,
    FORKLIFT: 20,
    BOT: 30,
    TRANSPORTABLE_SQUARE: 35,
    STUFF: 40
};

let draggableElements = new Set();
let maxZIndex = 1;
let objectScale = 0.25;
let pixelToFeetRatio = null;

function updateCursorStyle(img, isDragging) {
    img.style.cursor = isDragging ? 'none' : 'crosshair';
    document.body.style.cursor = isDragging ? 'none' : 'crosshair';
}

function addDraggableImage(imageSrc, event) {
    const img = document.createElement('img');
    img.style.opacity = '0';
    img.src = imageSrc;
    img.classList.add('draggable');
    img.id = `${imageSrc.split('.')[0]}_${Date.now()}`;
    
    if (imageSrc === 'forklift.png') {
        img.classList.add('forklift-image');
        img.dataset.scaleMultiplier = 1;
        img.style.zIndex = Z_INDEX_LAYERS.FORKLIFT;
    } else if (imageSrc === 'truck_side.png' || imageSrc === 'truck_side2.png') {
        img.classList.add('truck-image');
        img.dataset.scaleMultiplier = 6.75;
        img.style.zIndex = Z_INDEX_LAYERS.TRUCK;
    } else if (imageSrc === 'stuff.png') {
        img.classList.add('stuff-image');
        img.dataset.scaleMultiplier = 1;
        img.style.zIndex = Z_INDEX_LAYERS.STUFF;
    } else if (imageSrc === 'Slipbot.png' || imageSrc === 'SlipBot_Loaded.png') {
        img.classList.add('bot-image');
        img.dataset.scaleMultiplier = imageSrc === 'SlipBot_Loaded.png' ? 0.9 : 1;
        img.style.zIndex = Z_INDEX_LAYERS.BOT;
    }

    const yOffset = 100;
    img.style.position = 'absolute';
    img.style.left = `${event.clientX}px`;
    img.style.top = `${yOffset}px`;
    img.style.transformOrigin = 'center';

    img.onload = function() {
        const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
        img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
        img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
        img.style.opacity = '1';
        if (imageSrc === 'Slipbot.png' && pixelToFeetRatio === null) {
            pixelToFeetRatio = 17 / (img.naturalHeight * objectScale * multiplier);
        }
    };

    const state = {
        offsetX: 0,
        offsetY: 0,
        lastX: 0,
        lastY: 0,
        rotateDeg: 0,
        isLoaded: imageSrc === 'SlipBot_Loaded.png',
        group: null
    };

    img.addEventListener('click', function(e) {
        e.stopPropagation();
        const el = Array.from(draggableElements).find(el => el.img === img);
        if (el && el.isDragging) {
            el.isDragging = false;
            document.removeEventListener('mousemove', el.moveHandler);
            document.removeEventListener('mouseup', el.upHandler);
            updateCursorStyle(img, false);
        }
    });

    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -7.5 : 7.5;
        state.rotateDeg = (state.rotateDeg + delta + 360) % 360;
        if (state.group) {
            state.group.style.transform = `rotate(${state.rotateDeg}deg)`;
        } else {
            rotateElement(img, state.rotateDeg);
        }
    });

    if (imageSrc === 'Slipbot.png' || imageSrc === 'SlipBot_Loaded.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const currentLeft = parseFloat(img.style.left);
            const currentTop = parseFloat(img.style.top);
            if (!state.isLoaded) {
                img.src = 'SlipBot_Loaded.png';
                img.dataset.scaleMultiplier = 0.9;
                state.isLoaded = true;
            } else {
                img.src = 'Slipbot.png';
                img.dataset.scaleMultiplier = 1;
                state.isLoaded = false;
            }
            img.onload = function() {
                const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
                const oldCenter = getCenter(img);
                img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
                img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
                const newCenter = getCenter(img);
                img.style.left = `${currentLeft - (newCenter.x - oldCenter.x)}px`;
                img.style.top = `${currentTop - (newCenter.y - oldCenter.y)}px`;
                if (!state.group) rotateElement(img, state.rotateDeg);
            };
        });
    }

    if (imageSrc === 'truck_side.png' || imageSrc === 'truck_side2.png') {
        img.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const currentLeft = parseFloat(img.style.left);
            const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
            const scaledWidth = img.naturalWidth * objectScale * multiplier;
            const shift = scaledWidth / 5.5;
            if (img.src.endsWith('truck_side.png')) {
                img.src = 'truck_side2.png';
                img.style.left = `${currentLeft - shift}px`;
            } else {
                img.src = 'truck_side.png';
                img.style.left = `${currentLeft + shift}px`;
            }
            img.onload = function() {
                const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
                img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
                img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
            };
        });
    }

    img.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        updateZIndex(img);
        const el = Array.from(draggableElements).find(el => el.img === img);
        if (el) {
            el.isDragging = true;
            const dragTarget = state.group || img;
            el.state.offsetX = e.clientX - parseFloat(dragTarget.style.left);
            el.state.offsetY = e.clientY - parseFloat(dragTarget.style.top);
            if (img.src.includes('truck_side') || img.src.includes('Slipbot')) handleAttachments(img);
            el.moveHandler = function(moveEvent) {
                moveEvent.preventDefault();
                moveEvent.stopPropagation();
                if (el.isDragging) {
                    const newX = moveEvent.clientX - el.state.offsetX;
                    const newY = moveEvent.clientY - el.state.offsetY;
                    dragTarget.style.left = `${newX}px`;
                    dragTarget.style.top = `${newY}px`;
                    if (img.src.includes('truck_side')) {
                        draggableElements.forEach(attachedEl => {
                            if (attachedEl.img.dataset.attachedTo === img.id) {
                                const relX = parseFloat(attachedEl.img.dataset.relativeX);
                                const relY = parseFloat(attachedEl.img.dataset.relativeY);
                                const target = attachedEl.state.group || attachedEl.img;
                                target.style.left = `${newX + relX}px`;
                                target.style.top = `${newY + relY}px`;
                            }
                        });
                    }
                }
            };
            el.upHandler = function(upEvent) {
                upEvent.preventDefault();
                upEvent.stopPropagation();
                el.isDragging = false;
                updateCursorStyle(img, false);
                if (img.src.includes('truck_side')) {
                    draggableElements.forEach(el => {
                        delete el.img.dataset.relativeX;
                        delete el.img.dataset.relativeY;
                        delete el.img.dataset.attachedTo;
                    });
                }
                document.removeEventListener('mousemove', el.moveHandler);
                document.removeEventListener('mouseup', el.upHandler);
            };
            document.addEventListener('mousemove', el.moveHandler);
            document.addEventListener('mouseup', el.upHandler);
        }
        updateCursorStyle(img, true);
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
            draggableElements.forEach(el => {
                if (el.img.dataset.attachedTo === img.id) {
                    delete el.img.dataset.attachedTo;
                    if (el.state.group) {
                        document.body.appendChild(el.img);
                        el.img.style.left = `${parseFloat(state.group.style.left) + parseFloat(el.img.style.left)}px`;
                        el.img.style.top = `${parseFloat(state.group.style.top) + parseFloat(el.img.style.top)}px`;
                        el.state.group = null;
                    }
                }
            });
            if (state.group) {
                document.body.removeChild(state.group);
                state.group = null;
            }
            draggableElements.delete(Array.from(draggableElements).find(el => el.img === img));
            img.remove();
        }
    });

    draggableElements.add({ img, isDragging: false, state, moveHandler: null, upHandler: null });
    document.body.appendChild(img);
    return img;
}

function updateZIndex(element) {
    if (element.src) {
        if (element.src.includes('truck_side')) element.style.zIndex = Z_INDEX_LAYERS.TRUCK;
        else if (element.src.includes('forklift')) element.style.zIndex = Z_INDEX_LAYERS.FORKLIFT;
        else if (element.src.includes('Slipbot')) element.style.zIndex = Z_INDEX_LAYERS.BOT;
        else if (element.src.includes('stuff')) element.style.zIndex = Z_INDEX_LAYERS.STUFF;
    } else {
        element.style.zIndex = element.dataset.transportable ? Z_INDEX_LAYERS.TRANSPORTABLE_SQUARE : Z_INDEX_LAYERS.SQUARE;
    }
    maxZIndex = Math.max(maxZIndex, parseInt(element.style.zIndex));
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

let backgroundImage = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('backgroundUpload').addEventListener('change', function(e) {
        if (e.target.files.length > 0) addBackgroundImage(e.target.files[0]);
    });

    document.getElementById('addBotBtn').addEventListener('click', function(e) {
        addDraggableImage('Slipbot.png', e);
    });

    document.getElementById('addtrlrBtn').addEventListener('click', function(e) {
        addDraggableImage('truck_side.png', e);
    });

    document.getElementById('addForkliftBtn').addEventListener('click', function(e) {
        addDraggableImage('forklift.png', e);
    });

    document.getElementById('addStuffBtn').addEventListener('click', function(e) {
        addDraggableImage('stuff.png', e);
    });

    document.getElementById('addDrawBtn').addEventListener('click', startSquareDrawing);

    document.getElementById('helpBtn').addEventListener('click', () => {
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
            - Right-click Bot to load and unloaded
        `;
        alert(helpText.trim().replace(/\s+/g, ' ').replace(/ - /g, '\n- '));
    });
});

document.body.addEventListener('wheel', function(e) {
    e.preventDefault();
    const toggle = document.getElementById('backgroundToggle').checked;
    if (toggle) {
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        objectScale *= delta;
        objectScale = Math.max(0.1, Math.min(5, objectScale));
        draggableElements.forEach(el => {
            if (el.img.src) {
                const img = el.img;
                const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
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
                if (img.src.includes('Slipbot.png') && pixelToFeetRatio !== null) {
                    pixelToFeetRatio = 17 / (img.naturalHeight * objectScale * multiplier);
                }
            }
        });
        updateAllSquareDimensions();
    }
});

document.getElementById('backgroundToggle').addEventListener('change', function(e) {
    if (backgroundImage) backgroundImage.style.zIndex = e.target.checked ? '1' : '-1';
});

document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('draggable')) {
        draggableElements.forEach(el => {
            if (el.isDragging) {
                document.removeEventListener('mousemove', el.moveHandler);
                document.removeEventListener('mouseup', el.upHandler);
                el.isDragging = false;
                if (el.img.src) updateCursorStyle(el.img, false);
            }
        });
    }
    document.body.style.cursor = 'crosshair';
});

document.addEventListener('mouseleave', function() {
    draggableElements.forEach(el => {
        if (el.isDragging) {
            document.removeEventListener('mousemove', el.moveHandler);
            document.removeEventListener('mouseup', el.upHandler);
            el.isDragging = false;
            if (el.img.src) updateCursorStyle(el.img, false);
        }
    });
});

document.body.style.cursor = 'crosshair';

function addBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        if (backgroundImage) backgroundImage.remove();
        backgroundImage = document.createElement('img');
        backgroundImage.src = e.target.result;
        backgroundImage.classList.add('background-image');
        backgroundImage.style.position = 'absolute';
        backgroundImage.style.left = '50%';
        backgroundImage.style.top = '60px';
        backgroundImage.style.transform = 'translate(-50%, 0)';
        backgroundImage.style.opacity = '0';
        backgroundImage.style.pointerEvents = 'none';
        document.body.appendChild(backgroundImage);
        backgroundImage.onload = function() {
            const headerHeight = 60;
            const safetyMargin = 10;
            const maxWidth = window.innerWidth - 2 * safetyMargin;
            const maxHeight = window.innerHeight - headerHeight - 2 * safetyMargin;
            const imgWidth = backgroundImage.naturalWidth;
            const imgHeight = backgroundImage.naturalHeight;
            const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
            backgroundImage.style.width = `${imgWidth * scale}px`;
            backgroundImage.style.height = `${imgHeight * scale}px`;
            backgroundImage.style.transition = 'opacity 0.3s ease';
            backgroundImage.style.opacity = '1';
            backgroundImage.style.zIndex = document.getElementById('backgroundToggle').checked ? '1' : '-1';
        };
    };
    reader.readAsDataURL(file);
}

function handleAttachments(movingElement) {
    const isSlipbot = movingElement.src && movingElement.src.includes('Slipbot');
    const isTruck = movingElement.src && movingElement.src.includes('truck_side');
    
    if (isSlipbot) {
        const slipbotEl = Array.from(draggableElements).find(el => el.img === movingElement);
        if (!slipbotEl) return;

        draggableElements.forEach(el => {
            if (el.img !== movingElement && el.img.dataset.transportable && !el.img.dataset.attachedTo) {
                if (checkOverlap(movingElement, el.img)) {
                    if (!slipbotEl.state.group) {
                        const group = document.createElement('div');
                        group.style.position = 'absolute';
                        group.style.left = `${parseFloat(movingElement.style.left)}px`;
                        group.style.top = `${parseFloat(movingElement.style.top)}px`;
                        group.style.width = `${movingElement.offsetWidth}px`;
                        group.style.height = `${movingElement.offsetHeight}px`;
                        group.style.transformOrigin = `${movingElement.offsetWidth / 2}px ${movingElement.offsetHeight / 2}px`;
                        group.style.zIndex = Z_INDEX_LAYERS.BOT;

                        document.body.appendChild(group);
                        document.body.removeChild(movingElement);
                        movingElement.style.left = '0px';
                        movingElement.style.top = '0px';
                        movingElement.style.transform = '';
                        group.appendChild(movingElement);

                        slipbotEl.state.group = group;
                    }

                    const group = slipbotEl.state.group;
                    const botWidth = movingElement.offsetWidth;
                    const botHeight = movingElement.offsetHeight;
                    const squareWidth = el.img.offsetWidth;
                    const squareHeight = el.img.offsetHeight;

                    document.body.removeChild(el.img);
                    el.img.style.left = `${(botWidth - squareWidth) / 2}px`;
                    el.img.style.top = `${(botHeight - squareHeight) / 2}px`;
                    el.img.style.transform = '';
                    group.appendChild(el.img);

                    el.img.dataset.attachedTo = movingElement.id;
                    el.state.group = group;
                    group.style.transform = `rotate(${slipbotEl.state.rotateDeg}deg)`;
                }
            }
        });
    } else if (isTruck) {
        draggableElements.forEach(el => {
            if (el.img !== movingElement && parseInt(el.img.style.zIndex) > parseInt(movingElement.style.zIndex)) {
                const targetElement = el.state.group || el.img;
                if (checkOverlap(movingElement, targetElement)) {
                    const truckLeft = parseFloat(movingElement.style.left);
                    const truckTop = parseFloat(movingElement.style.top);
                    const targetLeft = parseFloat(targetElement.style.left);
                    const targetTop = parseFloat(targetElement.style.top);
                    const relX = targetLeft - truckLeft;
                    const relY = targetTop - truckTop;

                    el.img.dataset.relativeX = relX;
                    el.img.dataset.relativeY = relY;
                    el.img.dataset.attachedTo = movingElement.id;
                }
            }
        });
    }
}

let isDrawingSquare = false;
let activeSquare = null;

function startSquareDrawing(e) {
    e.stopPropagation();
    isDrawingSquare = true;
    document.body.style.cursor = 'crosshair';
}

function createSquare(e) {
    if (!isDrawingSquare) return;

    e.preventDefault();
    e.stopPropagation();

    if (pixelToFeetRatio === null) {
        alert('Please add a Slipbot first to calibrate measurements (Slipbot is 17ft tall).');
        isDrawingSquare = false;
        document.body.style.cursor = 'crosshair';
        return;
    }

    const square = document.createElement('div');
    square.classList.add('draggable');
    square.style.position = 'absolute';
    square.style.border = '2px solid rgba(0, 255, 0, 0.8)';
    square.style.backgroundColor = 'transparent';
    square.style.left = `${e.clientX}px`;
    square.style.top = `${e.clientY}px`;
    square.style.zIndex = Z_INDEX_LAYERS.SQUARE;
    square.style.cursor = 'move';
    square.style.userSelect = 'none';

    const widthLabel = document.createElement('div');
    widthLabel.style.position = 'absolute';
    widthLabel.style.top = '-20px';
    widthLabel.style.left = '50%';
    widthLabel.style.transform = 'translateX(-50%)';
    widthLabel.style.color = 'white';
    widthLabel.style.fontSize = '12px';
    widthLabel.style.pointerEvents = 'none';
    square.appendChild(widthLabel);

    const heightLabel = document.createElement('div');
    heightLabel.style.position = 'absolute';
    heightLabel.style.left = '-40px';
    heightLabel.style.top = '50%';
    heightLabel.style.transform = 'translateY(-50%)';
    heightLabel.style.color = 'white';
    heightLabel.style.fontSize = '12px';
    heightLabel.style.pointerEvents = 'none';
    square.appendChild(heightLabel);

    const state = {
        offsetX: 0,
        offsetY: 0,
        startWidth: 0,
        startHeight: 0,
        startX: e.clientX,
        startY: e.clientY,
        initialLeft: 0,
        initialTop: 0,
        isDragging: false,
        resizeSide: null,
        lastWidth: 0,
        lastHeight: 0,
        widthLabel: widthLabel,
        heightLabel: heightLabel,
        isTransportable: false,
        rotateDeg: 0,
        group: null
    };

    const EDGE_SIZE = 10;

    document.body.appendChild(square);

    function drawMoveHandler(moveEvent) {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        if (isDrawingSquare) {
            const width = Math.max(20, moveEvent.clientX - state.startX);
            const height = Math.max(20, moveEvent.clientY - state.startY);
            square.style.width = `${width}px`;
            square.style.height = `${height}px`;
            state.lastWidth = width;
            state.lastHeight = height;
            updateDimensions(square, state);
        }
    }

    function drawUpHandler(upEvent) {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        if (isDrawingSquare) {
            isDrawingSquare = false;
            document.body.style.cursor = 'crosshair';
            document.removeEventListener('mousemove', drawMoveHandler);
            document.removeEventListener('mouseup', drawUpHandler);
            setupSquareInteraction(square, state);
        }
    }

    document.addEventListener('mousemove', drawMoveHandler);
    document.addEventListener('mouseup', drawUpHandler);
}

function updateDimensions(square, state) {
    const widthPx = parseFloat(square.style.width);
    const heightPx = parseFloat(square.style.height);
    const widthFt = (widthPx * pixelToFeetRatio).toFixed(1);
    const heightFt = (heightPx * pixelToFeetRatio).toFixed(1);
    state.widthLabel.textContent = `${widthFt}ft`;
    state.heightLabel.textContent = `${heightFt}ft`;
}

function updateAllSquareDimensions() {
    draggableElements.forEach(el => {
        if (!el.img.src && el.state.widthLabel && el.state.heightLabel) {
            updateDimensions(el.img, el.state);
        }
    });
}

function setupSquareInteraction(square, state) {
    const EDGE_SIZE = 10;
    const DRAG_SMOOTHNESS = 0.5;
    const RESIZE_SENSITIVITY = 0.5;

    document.addEventListener('mousemove', (e) => {
        if (!state.isDragging && !state.resizeSide) {
            const rect = square.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= -EDGE_SIZE && x <= rect.width + EDGE_SIZE && y >= -EDGE_SIZE && y <= rect.height + EDGE_SIZE) {
                if (x < EDGE_SIZE) square.style.cursor = 'ew-resize';
                else if (x > rect.width - EDGE_SIZE) square.style.cursor = 'ew-resize';
                else if (y < EDGE_SIZE) square.style.cursor = 'ns-resize';
                else if (y > rect.height - EDGE_SIZE) square.style.cursor = 'ns-resize';
                else square.style.cursor = 'move';
            } else {
                square.style.cursor = 'default';
            }
        }
    });

    square.addEventListener('wheel', function(e) {
        if (state.isTransportable && square.dataset.attachedTo) {
            const bot = Array.from(draggableElements).find(el => el.img.id === square.dataset.attachedTo);
            if (bot) {
                bot.img.dispatchEvent(new WheelEvent('wheel', { deltaY: e.deltaY }));
            }
        }
    });

    square.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        updateZIndex(square);
        activeSquare = square;

        const rect = square.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let botUnderneath = null;
        draggableElements.forEach(el => {
            if (el.img.src && el.img.src.includes('Slipbot') && checkOverlap(square, el.img)) {
                botUnderneath = el;
            }
        });

        if (botUnderneath) {
            botUnderneath.isDragging = true;
            const dragTarget = botUnderneath.state.group || botUnderneath.img;
            botUnderneath.state.offsetX = e.clientX - parseFloat(dragTarget.style.left);
            botUnderneath.state.offsetY = e.clientY - parseFloat(dragTarget.style.top);
            handleAttachments(botUnderneath.img);

            const moveHandler = (moveEvent) => {
                moveEvent.preventDefault();
                moveEvent.stopPropagation();
                if (botUnderneath.isDragging) {
                    const newX = moveEvent.clientX - botUnderneath.state.offsetX;
                    const newY = moveEvent.clientY - botUnderneath.state.offsetY;
                    dragTarget.style.left = `${newX}px`;
                    dragTarget.style.top = `${newY}px`;
                }
            };

            const upHandler = (upEvent) => {
                upEvent.preventDefault();
                upEvent.stopPropagation();
                botUnderneath.isDragging = false;
                updateCursorStyle(botUnderneath.img, false);
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
            updateCursorStyle(botUnderneath.img, true);
        } else if (!state.isTransportable || !square.dataset.attachedTo) {
            state.startWidth = parseFloat(square.style.width) || state.lastWidth || 20;
            state.startHeight = parseFloat(square.style.height) || state.lastHeight || 20;
            state.startX = e.clientX;
            state.startY = e.clientY;
            state.initialLeft = parseFloat(square.style.left);
            state.initialTop = parseFloat(square.style.top);
            state.lastWidth = state.startWidth;
            state.lastHeight = state.startHeight;

            if (x < EDGE_SIZE) {
                state.resizeSide = 'left';
            } else if (x > rect.width - EDGE_SIZE) {
                state.resizeSide = 'right';
            } else if (y < EDGE_SIZE) {
                state.resizeSide = 'top';
            } else if (y > rect.height - EDGE_SIZE) {
                state.resizeSide = 'bottom';
            } else {
                state.isDragging = true;
                state.offsetX = e.clientX - state.initialLeft;
                state.offsetY = e.clientY - state.initialTop;
            }

            const moveHandler = (moveEvent) => {
                moveEvent.preventDefault();
                moveEvent.stopPropagation();

                if (state.isDragging && activeSquare === square) {
                    const targetX = moveEvent.clientX - state.offsetX;
                    const targetY = moveEvent.clientY - state.offsetY;
                    state.initialLeft += (targetX - state.initialLeft) * DRAG_SMOOTHNESS;
                    state.initialTop += (targetY - state.initialTop) * DRAG_SMOOTHNESS;
                    square.style.left = `${state.initialLeft}px`;
                    square.style.top = `${state.initialTop}px`;
                } else if (state.resizeSide && activeSquare === square) {
                    const dx = (moveEvent.clientX - state.startX) * RESIZE_SENSITIVITY;
                    const dy = (moveEvent.clientY - state.startY) * RESIZE_SENSITIVITY;

                    if (state.resizeSide === 'right') {
                        state.lastWidth = Math.max(20, state.startWidth + dx);
                        square.style.width = `${state.lastWidth}px`;
                    } else if (state.resizeSide === 'left') {
                        state.lastWidth = Math.max(20, state.startWidth - dx);
                        square.style.width = `${state.lastWidth}px`;
                        square.style.left = `${state.initialLeft + (state.startWidth - state.lastWidth)}px`;
                    } else if (state.resizeSide === 'bottom') {
                        state.lastHeight = Math.max(20, state.startHeight + dy);
                        square.style.height = `${state.lastHeight}px`;
                    } else if (state.resizeSide === 'top') {
                        state.lastHeight = Math.max(20, state.startHeight - dy);
                        square.style.height = `${state.lastHeight}px`;
                        square.style.top = `${state.initialTop + (state.startHeight - state.lastHeight)}px`;
                    }
                    updateDimensions(square, state);
                }
            };

            const upHandler = (upEvent) => {
                upEvent.preventDefault();
                upEvent.stopPropagation();
                state.isDragging = false;
                state.resizeSide = null;
                activeSquare = null;
                square.style.cursor = 'move';
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        }
    });

    square.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '1000';
        
        const dialog = document.createElement('div');
        dialog.style.position = 'absolute';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.background = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '5px';
        dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
        
        dialog.innerHTML = '<h3>Choose an action:</h3>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Square';
        deleteBtn.style.margin = '10px';
        deleteBtn.style.padding = '5px 15px';
        deleteBtn.addEventListener('click', () => {
            draggableElements.delete(Array.from(draggableElements).find(el => el.img === square));
            if (state.group) {
                state.group.removeChild(square);
                if (state.group.children.length === 1) {
                    const bot = state.group.children[0];
                    const botEl = Array.from(draggableElements).find(el => el.img === bot);
                    document.body.appendChild(bot);
                    bot.style.left = state.group.style.left;
                    bot.style.top = state.group.style.top;
                    bot.style.transform = state.group.style.transform;
                    document.body.removeChild(state.group);
                    botEl.state.group = null;
                }
            }
            square.remove();
            document.body.removeChild(overlay);
        });
        
        if (!square.dataset.attachedTo) {
            const transportBtn = document.createElement('button');
            transportBtn.textContent = state.isTransportable ? 'Make Non-Transportable' : 'Make Transportable';
            transportBtn.style.margin = '10px';
            transportBtn.style.padding = '5px 15px';
            transportBtn.addEventListener('click', () => {
                if (!state.isTransportable) {
                    square.dataset.transportable = 'true';
                    square.style.zIndex = Z_INDEX_LAYERS.TRANSPORTABLE_SQUARE;
                    state.isTransportable = true;
                    if (!square.id) square.id = 'square_' + Date.now();
                    handleAttachments(Array.from(draggableElements).find(el => el.img.src?.includes('Slipbot'))?.img);
                } else {
                    delete square.dataset.transportable;
                    delete square.dataset.attachedTo;
                    square.style.zIndex = Z_INDEX_LAYERS.SQUARE;
                    state.isTransportable = false;
                }
                updateZIndex(square);
                document.body.removeChild(overlay);
            });
            dialog.appendChild(transportBtn);
        } else {
            const detachBtn = document.createElement('button');
            detachBtn.textContent = 'Detach from Slipbot';
            detachBtn.style.margin = '10px';
            detachBtn.style.padding = '5px 15px';
            detachBtn.addEventListener('click', () => {
                delete square.dataset.attachedTo;
                if (state.group) {
                    document.body.appendChild(square);
                    square.style.left = `${parseFloat(state.group.style.left) + parseFloat(square.style.left)}px`;
                    square.style.top = `${parseFloat(state.group.style.top) + parseFloat(square.style.top)}px`;
                    square.style.transform = '';
                    state.group = null;
                    if (state.group.children.length === 1) {
                        const bot = state.group.children[0];
                        const botEl = Array.from(draggableElements).find(el => el.img === bot);
                        document.body.appendChild(bot);
                        bot.style.left = state.group.style.left;
                        bot.style.top = state.group.style.top;
                        bot.style.transform = state.group.style.transform;
                        document.body.removeChild(state.group);
                        botEl.state.group = null;
                    }
                }
                document.body.removeChild(overlay);
            });
            dialog.appendChild(detachBtn);
        }
        
        dialog.appendChild(deleteBtn);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    });

    draggableElements.add({ img: square, isDragging: false, state });
}

document.addEventListener('mousedown', createSquare);