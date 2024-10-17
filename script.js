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
    let startX, startY, xOffset = 0, yOffset = 0;
    let rotation = 0;

    img.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX - xOffset;
        startY = e.clientY - yOffset;
        isDragging = true;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
    });

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        xOffset = e.clientX - startX;
        yOffset = e.clientY - startY;
        setTranslate(xOffset, yOffset, img);
    }

    function dragEnd() {
        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0) rotate(${rotation}deg)`;
    }

    img.addEventListener('wheel', (e) => {
        e.preventDefault();
        rotation += Math.sign(e.deltaY) * 5;
        setTranslate(xOffset, yOffset, img);
    });

    img.onload = () => {
        // Apply initial scaling for slipbot images
        if (imageSrc.toLowerCase().includes('slipbot')) {
            img.style.width = '40px';
            img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
        }
    };

    img.addEventListener('click', toggleDrag);
    img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleSlipbotImage(img, rotation);
    });

    function toggleDrag(e) {
        if (img.src.toLowerCase().includes('slipbot')) {
            isDragging = !isDragging;
        }
    }

    function toggleSlipbotImage(img, rotation) {
        if (img.src.includes('Slipbot.png')) {
            img.src = 'SlipBot_Loaded.png';
        } else if (img.src.includes('SlipBot_Loaded.png')) {
            img.src = 'Slipbot.png';
        }
        img.style.width = '40px';
        img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
        img.style.transform = `translate3d(${parseFloat(img.style.left)}px, ${parseFloat(img.style.top)}px, 0) rotate(${rotation}deg)`;
    }
}

function toggleSlipbotImage(img, rotation) {
    if (img.src.includes('Slipbot.png')) {
        img.src = 'SlipBot_Loaded.png';
    } else if (img.src.includes('SlipBot_Loaded.png')) {
        img.src = 'Slipbot.png';
    }
    img.style.width = '40px';
    img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
    img.style.transform = `translate3d(${parseFloat(img.style.left)}px, ${parseFloat(img.style.top)}px, 0) rotate(${rotation}deg)`;
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
