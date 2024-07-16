document.addEventListener('DOMContentLoaded', function() {
    const doorsSection = document.getElementById('doors-section');
    const trailersSection = document.getElementById('trailers-section');

    // Create doors
    for (let i = 0; i < 5; i++) {
        const door = document.createElement('div');
        door.className = 'door';
        doorsSection.appendChild(door);
    }

    // Create trailers and slipbots
    for (let i = 0; i < 3; i++) {
        const trailer = document.createElement('div');
        trailer.className = 'trailer';
        
        for (let j = 0; j < 3; j++) {
            const slipbot = document.createElement('div');
            slipbot.className = 'slipbot';
            if (i === 2) slipbot.classList.add('empty');
            trailer.appendChild(slipbot);
            makeDraggable(slipbot);
        }
        
        trailersSection.appendChild(trailer);
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            // Bring the dragged element to the front
            element.style.zIndex = "1000";
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.position = "absolute";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            // Reset the z-index
            element.style.zIndex = "auto";
        }
    }
});
