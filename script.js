const getCenter = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = (x, y, cx, cy, angle) => {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = (cos * (x - cx)) - (sin * (y - cy)) + cx;
    const ny = (sin * (x - cx)) + (cos * (y - cy)) + cy;
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
    img.onload = () => {
        if (imageSrc.toLowerCase().includes('slipbot')) {
            img.style.width = '40px';
            img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
            img.style.zIndex = 2;
          img.style.opacity = 1;
        }
    };
    document.body.appendChild(img);
    draggableImages.push({ img, isDragging: false });
    makeImageDraggable(img);
    makeImageRotatable(img);
}

function createImageElement(imageSrc, event) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.classList.add('draggable');
    img.style.position = 'absolute';
    img.style.left = `${event.clientX}px`;
    img.style.top = `${event.clientY}px`;
    img.style.transformOrigin = 'center';
    return img;
}

let currentDraggable = null;

function makeImageDraggable(img) {
    let startX, startY, initialLeft, initialTop;
    img.addEventListener('click', function(e) {
        e.stopPropagation();
        if (currentDraggable === img) {
            currentDraggable = null;
        } else {
            currentDraggable = img;
            const rect = img.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            if (img.src.includes('truck')) {
                attachOverlappingSlipbots(img);
            }
        }
    });
    document.addEventListener('mousedown', function(e) {
        if (currentDraggable) {
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', function(e) {
        if (currentDraggable) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = initialLeft + dx;
            const newTop = initialTop + dy;
            currentDraggable.style.left = `${newLeft}px`;
            currentDraggable.style.top = `${newTop}px`;
            if (currentDraggable.src.includes('truck') && currentDraggable.attachedSlipbots) {
                currentDraggable.attachedSlipbots.forEach(({ slipbot, offsetX, offsetY }) => {
                    slipbot.style.left = `${newLeft + offsetX}px`;
                    slipbot.style.top = `${newTop + offsetY}px`;
                });
            }
        }
    });
    document.addEventListener('mouseup', function(e) {
        currentDraggable = null;
    });
}

function attachOverlappingSlipbots(truck) {
    const truckRect = truck.getBoundingClientRect();
    truck.attachedSlipbots = [];
    draggableImages.forEach(({ img: slipbot }) => {
        if (slipbot.src.includes('slipbot') && checkOverlap(truck, slipbot)) {
            const slipbotRect = slipbot.getBoundingClientRect();
            const center = getCenter(truck);
            const offset = { x: slipbotRect.left + slipbotRect.width / 2 - center.x, y: slipbotRect.top + slipbotRect.height / 2 - center.y };
            truck.attachedSlipbots.push({ slipbot, offsetX: offset.x, offsetY: offset.y });
        }
    });
}

function makeImageRotatable(img) {
    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (img.src.includes('truck')) {
            attachOverlappingSlipbots(img);
        }
        const currentRotation = getRotation(img);
        const newRotation = currentRotation + (e.deltaY > 0 ? 10 : -10);
        img.style.transform = `rotate(${newRotation}deg)`;
        if (img.src.includes('truck') && img.attachedSlipbots) {
            const center = getCenter(img);
            img.attachedSlipbots.forEach(({ slipbot, offsetX, offsetY }) => {
                const rotatedPoint = rotatePoint(center.x + offsetX, center.y + offsetY, center.x, center.y, newRotation - currentRotation);
                slipbot.style.left = `${rotatedPoint.x - slipbot.width / 2}px`;
                slipbot.style.top = `${rotatedPoint.y - slipbot.height / 2}px`;
                slipbot.style.transform = `rotate(${newRotation}deg)`;
            });
        }
    });
    img.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (img.src.includes('Slipbot.png') || img.src.includes('SlipBot_Loaded.png')) {
            toggleSlipbotImage(img);
        }
    });
}

function toggleSlipbotImage(img) {
    const currentSrc = img.src;
    const currentRotation = getRotation(img);
    if (currentSrc.includes('Slipbot.png')) {
        img.src = 'SlipBot_Loaded.png';
    } else {
        img.src = 'Slipbot.png';
    }
    img.onload = () => {
        img.style.width = '40px';
        img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
        img.style.transform = `rotate(${currentRotation}deg)`;
    };
}

function getRotation(el) {
    const st = window.getComputedStyle(el, null);
    const tm = st.getPropertyValue("transform") || "none";
    if (tm !== "none") {
        const values = tm.split('(')[1].split(')')[0].split(',');
        const angle = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
        return (angle < 0 ? angle + 360 : angle);
    }
    return 0;
}

document.getElementById('addBotBtn').addEventListener('click', function(e) {
    addDraggableImage('Slipbot.png', e);
});

document.getElementById('addtrlrBtn').addEventListener('click', function(e) {
    addDraggableImage('truck.png', e);
});

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
