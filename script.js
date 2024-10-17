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

    img.onload = () => {
        if (imageSrc.toLowerCase().includes('slipbot')) {
            img.style.width = '40px'; 
            img.style.height = `${(40 / img.naturalWidth) * img.naturalHeight}px`; 
            img.style.zIndex = 2; // Ensure Slipbots are above trucks
        } else if (imageSrc.toLowerCase().includes('truck')) {
            img.style.width = '50px'; 
            img.style.height = `${(50 / img.naturalWidth) * img.naturalHeight}px`; 
            img.style.zIndex = 1; // Trucks have lower z-index
        }
        img.style.opacity = 1; // Ensure no transparency
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

    // Return the image element
    return img;
}

function makeImageDraggable(img) {
    let isDragging = false;
    let startX, startY;

    img.addEventListener('click', function(e) {
        isDragging = !isDragging;
        if (isDragging) {
            startX = e.clientX - img.offsetLeft;
            startY = e.clientY - img.offsetTop;
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);

            if (img.src.includes('truck')) {
                // Attach overlapping Slipbots to the truck
                draggableImages.forEach(({ img: slipbot }) => {
                    if (slipbot.src.includes('slipbot') && checkOverlap(img, slipbot)) {
                        attachSlipbotToTruck(slipbot, img);
                    }
                });
            }
        } else {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        }
    });

    function mouseMoveHandler(e) {
        if (isDragging) {
            img.style.left = (e.clientX - startX) + 'px';
            img.style.top = (e.clientY - startY) + 'px';

            if (img.src.includes('truck') && img.attachedSlipbots) {
                img.attachedSlipbots.forEach(({ slipbot, offsetX, offsetY }) => {
                    slipbot.style.left = (e.clientX - startX + offsetX) + 'px';
                    slipbot.style.top = (e.clientY - startY + offsetY) + 'px';
                });
            }
        }
    }

    function mouseUpHandler() {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    }
}

function attachSlipbotToTruck(slipbot, truck) {
    const truckRect = truck.getBoundingClientRect();
    const slipbotRect = slipbot.getBoundingClientRect();

    // Calculate relative position
    const offsetX = slipbotRect.left - truckRect.left;
    const offsetY = slipbotRect.top - truckRect.top;

    // Attach slipbot to truck
    slipbot.style.position = 'absolute';
    slipbot.style.left = `${offsetX}px`;
    slipbot.style.top = `${offsetY}px`;

    // Add slipbot to truck's attached list
    if (!truck.attachedSlipbots) {
        truck.attachedSlipbots = [];
    }
    truck.attachedSlipbots.push({ slipbot, offsetX, offsetY });
}

function makeImageRotatable(img) {
    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        const currentRotation = getRotation(img);
        const newRotation = currentRotation + (e.deltaY > 0 ? 10 : -10);
        img.style.transform = `rotate(${newRotation}deg)`;

        // Rotate attached slipbots if the image is a truck
        if (img.attachedSlipbots) {
            img.attachedSlipbots.forEach(({ slipbot, offsetX, offsetY }) => {
                const center = getCenter(img);
                const rotatedPoint = rotatePoint(center.x + offsetX, center.y + offsetY, center.x, center.y, newRotation - currentRotation);
                slipbot.style.left = `${rotatedPoint.x}px`;
                slipbot.style.top = `${rotatedPoint.y}px`;
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
        const leftAdjust = (currentRect.width - newRect.width) / 2;
        const topAdjust = (currentRect.height - newRect.height) / 2;
        img.style.left = `${parseFloat(img.style.left) + leftAdjust}px`;
        img.style.top = `${parseFloat(img.style.top) + topAdjust}px`;
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
