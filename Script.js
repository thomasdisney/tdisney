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
        warehouseLayout.style.display = 'flex';

        // Create doors section
        const doorsSection = document.createElement('div');
        doorsSection.className = 'doors-section';
        doorsSection.style.width = '20%';
        doorsSection.style.borderRight = '2px solid #000';

        // Create doors
        for (let i = 0; i < doors; i++) {
            const door = document.createElement('div');
            door.className = 'door';
            door.style.height = `${100 / doors}%`;
            door.style.backgroundColor = '#f0f0f0';
            door.style.border = '1px solid #ccc';
            door.style.margin = '2px 0';
            doorsSection.appendChild(door);
        }

        warehouseLayout.appendChild(doorsSection);

        // Create trailers section
        const trailersSection = document.createElement('div');
        trailersSection.className = 'trailers-section';
        trailersSection.style.width = '80%';
        trailersSection.style.display = 'flex';
        trailersSection.style.flexDirection = 'column';

        // Create trailers
        for (let i = 0; i < trailers; i++) {
            const trailer = document.createElement('div');
            trailer.className = 'trailer';
            trailer.style.height = `${100 / trailers}%`;
            trailer.style.display = 'flex';
            trailer.style.justifyContent = 'space-around';
            trailer.style.alignItems = 'center';
            trailer.style.border = '1px dashed #000';
            trailer.style.margin = '2px 0';

            // Add Slipbots to trailers
            for (let j = 0; j < 3; j++) {
                const bot = document.createElement('div');
                bot.className = 'bot';
                bot.style.width = '30%';
                bot.style.height = '80%';
                bot.style.backgroundColor = i < trailers - 1 ? '#a0a0a0' : '#c0c0c0';
                bot.style.display = 'flex';
                bot.style.justifyContent = 'center';
                bot.style.alignItems = 'center';
                bot.style.fontSize = '12px';
                bot.textContent = i < trailers - 1 ? 'Loaded Slipbot' : 'Empty Slipbot';
                trailer.appendChild(bot);
            }

            trailersSection.appendChild(trailer);
        }

        warehouseLayout.appendChild(trailersSection);
    }
});
