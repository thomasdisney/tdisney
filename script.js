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

function addDraggableImage(imageSrc, event) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'draggable';
    img.style.left = event.clientX + 'px';
    img.style.top = event.clientY + 'px';
    img.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(img);

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let rotation = 0;

    img.addEventListener('mousedown', dragStart);
    img.addEventListener('mouseup', dragEnd);
    img.addEventListener('mousemove', drag);
    img.addEventListener('wheel', rotate);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === img) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;

        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, img);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0) rotate(${rotation}deg)`;
    }

    function rotate(e) {
        e.preventDefault();
        rotation += Math.sign(e.deltaY) * 5;
        setTranslate(xOffset, yOffset, img);
    }
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
    }
    reader.readAsDataURL(file);
}

function makeBackgroundDraggable(img) {
    let isDragging = false;
    let startX, startY;

    img.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - img.offsetLeft;
        startY = e.clientY - img.offsetTop;
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            img.style.left = (e.clientX - startX) + 'px';
            img.style.top = (e.clientY - startY) + 'px';
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
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
