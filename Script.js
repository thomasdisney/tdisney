document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('warehouse-form');
    const warehouseLayout = document.getElementById('warehouse-layout');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const numBots = parseInt(document.getElementById('num-bots').value);
        const numTrailers = parseInt(document.getElementById('num-trailers').value);
        const numLocations = parseInt(document.getElementById('num-locations').value);
        const numDoors = parseInt(document.getElementById('num-doors').value);

        generateWarehouseLayout(numBots, numTrailers, numLocations, numDoors);
    });

    function generateWarehouseLayout(bots, trailers, locations, doors) {
        warehouseLayout.innerHTML = ''; // Clear previous layout

        // Create doors section
        const doorsSection = document.createElement('div');
        doorsSection.className = 'doors-section';

        // Create doors
        for (let i = 0; i < doors; i++) {
            const door = document.createElement('div');
            door.className = 'door';
            door.style.height = `${100 / doors}%`;
            doorsSection.appendChild(door);
        }

        warehouseLayout.appendChild(doorsSection);

        // Create trailers
        for (let i = 0; i < trailers; i++) {
            const trailer = document.createElement('div');
            trailer.className = 'trailer';
            trailer.textContent = `Trailer ${i + 1}`;
            trailer.style.width = '120px';
            trailer.style.height = '60px';
            trailer.style.left = `${Math.random() * (warehouseLayout.offsetWidth - 140) + 140}px`;
            trailer.style.top = `${Math.random() * (warehouseLayout.offsetHeight - 80)}px`;
            warehouseLayout.appendChild(trailer);
            makeDraggable(trailer);
        }

        // Create bots
        for (let i = 0; i < bots; i++) {
            const bot = document.createElement('div');
            bot.className = 'bot';
            bot.textContent = `Bot ${i + 1}`;
            bot.style.width = '60px';
            bot.style.height = '60px';
            bot.style.left = `${Math.random() * (warehouseLayout.offsetWidth - 80) + 140}px`;
            bot.style.top = `${Math.random() * (warehouseLayout.offsetHeight - 80)}px`;
            if (i >= bots - 3) {
                bot.classList.add('empty');
                bot.textContent += ' (Empty)';
            }
            warehouseLayout.appendChild(bot);
            makeDraggable(bot);
        }
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
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Initial generation
    generateWarehouseLayout(9, 3, 1, 5);
});
