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

let draggableImages = [];

function addDraggableImage(imageSrc, event) {
    const img = createImageElement(imageSrc, event);
    const state = initializeState(event, img);
    const attachedElements = new Set();

    img.onload = () => {
        adjustImageSize(img, imageSrc);
        if (imageSrc.toLowerCase().includes('slipbot')) {
            img.style.width = '40px'; // Scale slipbot to 40px width
            img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`; // Maintain aspect ratio
        }
    };

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

    let isDragging = false;
    let startX, startY;
    let rotation = 0;
    let attachedElements = new Set();

    img.onload = () => {
        adjustImageSize(img, imageSrc);
    };

    img.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    function startDrag(e) {
        if (e.button !== 0) return; // Only left mouse button
        e.preventDefault();
        isDragging = true;
        startX = e.clientX - img.offsetLeft;
        startY = e.clientY - img.offsetTop;
        if (imageSrc.toLowerCase().includes('truck')) {
            attachOverlappingImages();
        }
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const left = e.clientX - startX;
        const top = e.clientY - startY;
        img.style.left = `${left}px`;
        img.style.top = `${top}px`;
        
        if (imageSrc.toLowerCase().includes('truck')) {
            moveAttachedElements(left, top);
        }
    }

    function stopDrag() {
        isDragging = false;
        if (imageSrc.toLowerCase().includes('truck')) {
            detachImages();
        }
    }

    img.addEventListener('wheel', (e) => {
        e.preventDefault();
        rotation += Math.sign(e.deltaY) * 5;
        img.style.transform = `rotate(${rotation}deg)`;
        
        if (imageSrc.toLowerCase().includes('truck')) {
            rotateAttachedElements(rotation);
        }
    });

    img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (imageSrc.toLowerCase().includes('slipbot')) {
            toggleSlipbotImage(img);
        }
    });

    function attachOverlappingImages() {
        draggableImages.forEach(dragImg => {
            if (dragImg.img !== img && checkOverlap(img, dragImg.img)) {
                const rect = img.getBoundingClientRect();
                const dragRect = dragImg.img.getBoundingClientRect();
                dragImg.relativeX = dragRect.left - rect.left;
                dragImg.relativeY = dragRect.top - rect.top;
                attachedElements.add(dragImg);
            }
        });
    }

    function moveAttachedElements(left, top) {
        attachedElements.forEach(dragImg => {
            dragImg.img.style.left = `${left + dragImg.relativeX}px`;
            dragImg.img.style.top = `${top + dragImg.relativeY}px`;
        });
    }

    function rotateAttachedElements(angle) {
        const imgRect = img.getBoundingClientRect();
        const imgCenter = {
            x: imgRect.left + imgRect.width / 2,
            y: imgRect.top + imgRect.height / 2
        };

        attachedElements.forEach(dragImg => {
            const dragRect = dragImg.img.getBoundingClientRect();
            const dragCenter = {
                x: dragRect.left + dragRect.width / 2,
                y: dragRect.top + dragRect.height / 2
            };

            const rotatedPoint = rotatePoint(
                dragCenter.x, dragCenter.y,
                imgCenter.x, imgCenter.y,
                angle
            );

            dragImg.img.style.left = `${rotatedPoint.x - dragRect.width / 2}px`;
            dragImg.img.style.top = `${rotatedPoint.y - dragRect.height / 2}px`;
        });
    }

    function detachImages() {
        attachedElements.clear();
    }

    const dragImage = { img, isDragging: () => isDragging, setDragging: (value) => isDragging = value };
    draggableImages.push(dragImage);
    return dragImage;
}

function adjustImageSize(img, imageSrc) {
    if (imageSrc.toLowerCase().includes('slipbot') || imageSrc.toLowerCase().includes('truck')) {
        img.style.width = '40px';
        img.style.height = 'auto';
    }
    // Ensure the image maintains its aspect ratio
    img.onload = () => {
        img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
    };
}

function toggleSlipbotImage(img) {
    const currentSrc = img.src;
    const currentRect = img.getBoundingClientRect();
    const currentRotation = getRotation(img);

    if (currentSrc.includes('Slipbot.png')) {
        img.src = 'SlipBot_Loaded.png';
    } else if (currentSrc.includes('SlipBot_Loaded.png')) {
        img.src = 'Slipbot.png';
    }

    img.onload = () => {
        adjustImageSize(img, img.src);
        const newRect = img.getBoundingClientRect();
        
        // Adjust position to maintain center
        const leftAdjust = (currentRect.width - newRect.width) / 2;
        const topAdjust = (currentRect.height - newRect.height) / 2;
        
        img.style.left = `${parseFloat(img.style.left) + leftAdjust}px`;
        img.style.top = `${parseFloat(img.style.top) + topAdjust}px`;
        
        // Maintain rotation
        img.style.transform = `rotate(${currentRotation}deg)`;
    };
}

function getRotation(el) {
    const st = window.getComputedStyle(el, null);
    const tm = st.getPropertyValue("-webkit-transform") ||
               st.getPropertyValue("-moz-transform") ||
               st.getPropertyValue("-ms-transform") ||
               st.getPropertyValue("-o-transform") ||
               st.getPropertyValue("transform");
    if (tm !== "none") {
        const values = tm.split('(')[1].split(')')[0].split(',');
        const angle = Math.round(Math.atan2(values[1], values[0]) * (180/Math.PI));
        return (angle < 0 ? angle + 360 : angle);
    }
    return 0;
}

document.getElementById('addBotBtn').addEventListener('click', function(e) { addDraggableImage('Slipbot.png', e) });
document.getElementById('addtrlrBtn').addEventListener('click', function(e) { addDraggableImage('truck.png', e) });

let backgroundImages = [];
let selectedBackground = null;

function addBackgroundImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'background-image';
        document.body.appendChild(img);
        backgroundImages.push(img);
        makeBackgroundDraggable(img);
    };
    reader.onerror = function() {
        console.error("Error reading file");
    };
    reader.readAsDataURL(file);
}

function makeBackgroundDraggable(img) {
    let isDragging = false;
    let startX, startY;

    const mouseMoveHandler = function(e) {
        if (isDragging) {
            img.style.left = (e.clientX - startX) + 'px';
            img.style.top = (e.clientY - startY) + 'px';
        }
    };

    const mouseUpHandler = function() {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    img.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - img.offsetLeft;
        startY = e.clientY - img.offsetTop;
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });
}

function selectBackgroundImage(img) {
    if (selectedBackground) {
        selectedBackground.classList.remove('selected');
    }
    selectedBackground = img;
    selectedBackground.classList.add('selected');
}

document.getElementById('backgroundUpload').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
        addBackgroundImage(files[i]);
    }
});

document.getElementById('scaleBackground').addEventListener('input', function(e) {
    if (selectedBackground) {
        const scale = e.target.value / 100;
        selectedBackground.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
});

document.getElementById('backgroundToggle').addEventListener('change', function(e) {
    backgroundImages.forEach(img => {
        img.style.display = e.target.checked ? 'block' : 'none';
    });
});

document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('background-image')) {
        selectBackgroundImage(e.target);
    }
});
