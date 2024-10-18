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
    const rect1 = elem1.getBoundingClientRect(),
          rect2 = elem2.getBoundingClientRect();
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
};

let draggableImages = [];

function addDraggableImage(imageSrc, event) {
    const img = createImageElement(imageSrc, event);
    img.onload = () => {
        if (imageSrc.toLowerCase().includes('slipbot')) {
            img.style.width = '40px';
            img.style.height = 'auto';
            img.style.zIndex = 2;
            img.style.opacity = 1; 
        } else if (imageSrc.toLowerCase().includes('truck')) {
            img.style.zIndex = 1; 
        }
    };
    document.body.appendChild(img);
    draggableImages.push(img);
    if (imageSrc.toLowerCase().includes('truck')) {
        makeTruckDraggable(img);
    } else if (imageSrc.toLowerCase().includes('slipbot')) {
        makeSlipbotDraggable(img);
    }
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

function makeTruckDraggable(truck) {
    let isDragging = false;
    let startX, startY;
    let attachedElements = [];

    function updateAttachedElements() {
        attachedElements = draggableImages.filter(el => 
            el !== truck && el.src.includes('slipbot') && checkOverlap(truck, el)
        );
    }

    function startDragging(e) {
        isDragging = true;
        startX = e.clientX - truck.offsetLeft;
        startY = e.clientY - truck.offsetTop;
        updateAttachedElements();
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDragging);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;

        // Move the truck
        moveElement(truck, newX - parseFloat(truck.style.left), newY - parseFloat(truck.style.top));

        // Move attached slipbots
        attachedElements.forEach(el => {
            moveElement(el, newX - parseFloat(truck.style.left), newY - parseFloat(truck.style.top));
        });
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDragging);
    }

    truck.addEventListener('mousedown', startDragging);
}

function makeSlipbotDraggable(slipbot) {
    let isDraggable = false; // Start with dragging off
    let startX, startY;

    function onDrag(e) {
        if (!isDraggable) return;
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        moveElement(slipbot, newX - parseFloat(slipbot.style.left), newY - parseFloat(slipbot.style.top));
    }

    slipbot.addEventListener('click', function(e) {
        isDraggable = !isDraggable; // Toggle dragging on click
        if (isDraggable) {
            startX = e.clientX - slipbot.offsetLeft;
            startY = e.clientY - slipbot.offsetTop;
            document.addEventListener('mousemove', onDrag);
        } else {
            document.removeEventListener('mousemove', onDrag);
        }
    });
}

function moveElement(el, dx, dy) {
    const left = parseFloat(el.style.left) + dx;
    const top = parseFloat(el.style.top) + dy;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
}

function makeImageRotatable(img) {
    let rotateDeg = 0;
    let isMirrored = false;

    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        rotateDeg += e.deltaY > 0 ? 10 : -10;
        rotateElement(img, rotateDeg, isMirrored);
        
        if (img.src.includes('truck')) {
            const attachedElements = getAttachedElements(img);
            attachedElements.forEach(el => {
                rotateElement(el, rotateDeg, isMirrored);
            });
        }
    });

    img.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (img.src.includes('Slipbot.png') || img.src.includes('SlipBot_Loaded.png')) {
            toggleSlipbotImage(img);
        } else if (img.src.includes('truck')) {
            isMirrored = !isMirrored;
            rotateElement(img, rotateDeg, isMirrored);
        }
    });
}

function rotateElement(el, angle, mirrored) {
    el.style.transform = `rotate(${angle}deg) scaleY(${mirrored ? -1 : 1})`;
}

function getAttachedElements(truck) {
    return draggableImages.filter(el => el !== truck && el.src.includes('slipbot') && checkOverlap(truck, el));
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
        img.style.height = 'auto';
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

// Event listeners for adding images
document.getElementById('addBotBtn').addEventListener('click', function(e) {
    addDraggableImage('Slipbot.png', e);
});

document.getElementById('addtrlrBtn').addEventListener('click', function(e) {
    addDraggableImage('truck.png', e);
});
