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

const checkOverlap = (rect1, rect2) => {
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
            img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`;
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
    let groupedImages = [];

    function startDragging(e) {
        isDragging = true;
        startX = e.clientX - truck.offsetLeft;
        startY = e.clientY - truck.offsetTop;
        groupedImages = getOverlappingImages(truck);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDragging);
    }

    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        
        truck.style.left = `${newX}px`;
        truck.style.top = `${newY}px`;

        groupedImages.forEach(img => {
            img.element.style.left = `${newX + img.offsetX}px`;
            img.element.style.top = `${newY + img.offsetY}px`;
        });
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDragging);
        // Update grouped images when dragging stops
        groupedImages = getOverlappingImages(truck);
    }

    truck.addEventListener('mousedown', startDragging);
}

function makeSlipbotDraggable(slipbot) {
    let isDraggable = false;
    let startX, startY;

    function onDrag(e) {
        if (!isDraggable) return;
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        slipbot.style.left = `${newX}px`;
        slipbot.style.top = `${newY}px`;
    }

    slipbot.addEventListener('click', function(e) {
        isDraggable = !isDraggable;
        if (isDraggable) {
            startX = e.clientX - slipbot.offsetLeft;
            startY = e.clientY - slipbot.offsetTop;
            document.addEventListener('mousemove', onDrag);
        } else {
            document.removeEventListener('mousemove', onDrag);
        }
    });
}

function getOverlappingImages(truck) {
    const truckRect = truck.getBoundingClientRect();
    return draggableImages
        .filter(img => img !== truck && img.src.includes('slipbot') && checkOverlap(truckRect, img.getBoundingClientRect()))
        .map(img => ({
            element: img,
            offsetX: img.offsetLeft - truck.offsetLeft,
            offsetY: img.offsetTop - truck.offsetTop
        }));
}

function makeImageRotatable(img) {
    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        const currentRotation = getRotation(img);
        const newRotation = currentRotation + (e.deltaY > 0 ? 10 : -10);
        img.style.transform = `rotate(${newRotation}deg)`;
        
        if (img.src.includes('truck')) {
            const overlappingImages = getOverlappingImages(img);
            const center = getCenter(img);
            overlappingImages.forEach(overlappingImg => {
                const rotatedPoint = rotatePoint(
                    center.x + overlappingImg.offsetX,
                    center.y + overlappingImg.offsetY,
                    center.x,
                    center.y,
                    newRotation - currentRotation
                );
                overlappingImg.style.left = `${rotatedPoint.x - overlappingImg.width / 2}px`;
                overlappingImg.style.top = `${rotatedPoint.y - overlappingImg.height / 2}px`;
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

// Event listeners and background image handling remain unchanged
document.getElementById('addBotBtn').addEventListener('click', function(e) {
    addDraggableImage('Slipbot.png', e);
});

document.getElementById('addtrlrBtn').addEventListener('click', function(e) {
    addDraggableImage('truck.png', e);
});
