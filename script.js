const getCenter = function (el) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const rotatePoint = function (x, y, cx, cy, angle) {
  const r = (Math.PI / 180) * angle;
  const cos = Math.cos(r), sin = Math.sin(r);
  const dx = x - cx, dy = y - cy;
  return { x: cx + cos * dx - sin * dy, y: cy + sin * dx + cos * dy };
};

const checkOverlap = function (elem1, elem2) {
  const rect1 = elem1.getBoundingClientRect();
  const rect2 = elem2.getBoundingClientRect();
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
};

function isSlipbotSrc(src) {
  return typeof src === "string" && src.toLowerCase().includes("slipbot");
}
function isTruckSrc(src) {
  return typeof src === "string" && src.toLowerCase().includes("truck_side");
}
function isForkliftSrc(src) {
  return typeof src === "string" && src.toLowerCase().includes("forklift");
}
function isStuffSrc(src) {
  return typeof src === "string" && src.toLowerCase().includes("stuff");
}

const Z_INDEX_LAYERS = {
  SQUARE: 5,
  TRUCK: 10,
  FORKLIFT: 20,
  BOT: 30,
  TRANSPORTABLE_SQUARE: 35,
  STUFF: 40,
};

let draggableElements = new Set();
let maxZIndex = 1;
let objectScale = 0.25;
let pixelToFeetRatio = null;
let isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;

function updateCursorStyle(img, isDragging) {
  if (!isMobile) {
    img.style.cursor = isDragging ? "none" : "crosshair";
    document.body.style.cursor = isDragging ? "none" : "crosshair";
  }
}

function bringToFront(el) {
  maxZIndex = Math.max(maxZIndex, Number(el.style.zIndex) || 0) + 1;
  el.style.zIndex = String(maxZIndex);
}

function addDraggableImage(imageSrc, event, isMobileInit = false) {
  const img = document.createElement("img");
  img.style.opacity = "0";
  img.src = imageSrc;
  img.classList.add("draggable");
  img.id = `${imageSrc.split(".")[0]}_${Date.now()}`;

  if (imageSrc === "forklift.png") {
    img.classList.add("forklift-image");
    img.dataset.scaleMultiplier = 1;
    img.style.zIndex = Z_INDEX_LAYERS.FORKLIFT;
  } else if (imageSrc === "truck_side.png" || imageSrc === "truck_side2.png") {
    img.classList.add("truck-image");
    img.dataset.scaleMultiplier = 6.75;
    img.style.zIndex = Z_INDEX_LAYERS.TRUCK;
  } else if (imageSrc === "stuff.png") {
    img.classList.add("stuff-image");
    img.dataset.scaleMultiplier = 1;
    img.style.zIndex = Z_INDEX_LAYERS.STUFF;
  } else if (imageSrc === "Slipbot.png" || imageSrc === "SlipBot_Loaded.png") {
    img.classList.add("bot-image");
    img.dataset.scaleMultiplier = imageSrc === "SlipBot_Loaded.png" ? 0.9 : 1;
    img.style.zIndex = Z_INDEX_LAYERS.BOT;
  }

  img.style.position = "absolute";
  if (!isMobileInit) {
    const x = event.clientX || window.innerWidth / 2;
    const y = event.clientY || window.innerHeight / 2;
    img.style.left = `${x}px`;
    img.style.top = `${y + 70}px`;
  } else {
    img.style.left = `${window.innerWidth / 2}px`;
    img.style.top = `${window.innerHeight / 2}px`;
  }
  img.style.transformOrigin = "center";
  img.style.willChange = "transform";

  img.onerror = function () {
    console.error(`Failed to load image: ${imageSrc}`);
  };

  img.onload = function () {
    const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
    img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
    img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
    img.style.opacity = "1";
    if (imageSrc === "Slipbot.png" && pixelToFeetRatio === null) {
      pixelToFeetRatio = 17 / (img.naturalHeight * objectScale * multiplier);
    }
  };

  const state = {
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    rotateDeg: 0,
    isLoaded: imageSrc === "SlipBot_Loaded.png",
    group: null,
  };

  if (!isMobile) {
    img.addEventListener("click", function (e) {
      e.stopPropagation();
      const el = Array.from(draggableElements).find((el) => el.img === img);
      if (el && el.isDragging) {
        el.isDragging = false;
        document.removeEventListener("mousemove", el.moveHandler);
        document.removeEventListener("mouseup", el.upHandler);
        updateCursorStyle(img, false);
      }
    });

    img.addEventListener("wheel", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const delta = Math.sign(e.deltaY) * 7.5;
      state.rotateDeg += delta;
      const target = state.group || img;
      rotateElement(target, state.rotateDeg);
    });

    if (isSlipbotSrc(img.src)) {
      img.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        const currentLeft = parseFloat(img.style.left);
        const currentTop = parseFloat(img.style.top);
        if (!state.isLoaded) {
          img.src = "SlipBot_Loaded.png";
          img.dataset.scaleMultiplier = 0.9;
          state.isLoaded = true;
        } else {
          img.src = "Slipbot.png";
          img.dataset.scaleMultiplier = 1;
          state.isLoaded = false;
        }
        img.onload = function () {
          const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
          const oldCenter = getCenter(img);
          img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
          img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
          const newCenter = getCenter(img);
          img.style.left = `${currentLeft - (newCenter.x - oldCenter.x)}px`;
          img.style.top = `${currentTop - (newCenter.y - oldCenter.y)}px`;
          if (!state.group) rotateElement(img, state.rotateDeg);
        };
      });
    }

    if (isTruckSrc(img.src)) {
      img.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        const currentLeft = parseFloat(img.style.left);
        const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
        const scaledWidth = img.naturalWidth * objectScale * multiplier;
        const shift = scaledWidth / 5.5;
        if (img.src.toLowerCase().endsWith("truck_side.png")) {
          img.src = "truck_side2.png";
          img.style.left = `${currentLeft - shift}px`;
        } else {
          img.src = "truck_side.png";
          img.style.left = `${currentLeft + shift}px`;
        }
        img.onload = function () {
          const mult = parseFloat(img.dataset.scaleMultiplier) || 1;
          img.style.width = `${img.naturalWidth * objectScale * mult}px`;
          img.style.height = `${img.naturalHeight * objectScale * mult}px`;
        };
      });
    }

    img.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      updateZIndex(img);
      bringToFront(state.group || img);
      const el = Array.from(draggableElements).find((el) => el.img === img);
      if (el) {
        el.isDragging = true;
        const dragTarget = state.group || img;
        el.state.offsetX = e.clientX - parseFloat(dragTarget.style.left);
        el.state.offsetY = e.clientY - parseFloat(dragTarget.style.top);
        if (isTruckSrc(img.src) || isSlipbotSrc(img.src)) handleAttachments(img);
        el.moveHandler = function (moveEvent) {
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          if (el.isDragging) {
            const newX = moveEvent.clientX - el.state.offsetX;
            const newY = moveEvent.clientY - el.state.offsetY;
            dragTarget.style.left = `${newX}px`;
            dragTarget.style.top = `${newY}px`;
            if (isTruckSrc(img.src)) {
              draggableElements.forEach((attachedEl) => {
                if (attachedEl.img.dataset.attachedTo === img.id) {
                  const relX = parseFloat(attachedEl.img.dataset.relativeX);
                  const relY = parseFloat(attachedEl.img.dataset.relativeY);
                  const target = attachedEl.state.group || attachedEl.img;
                  target.style.left = `${newX + relX}px`;
                  target.style.top = `${newY + relY}px`;
                }
              });
            }
          }
        };
        el.upHandler = function (upEvent) {
          upEvent.preventDefault();
          upEvent.stopPropagation();
          el.isDragging = false;
          updateCursorStyle(img, false);
          if (isTruckSrc(img.src)) {
            draggableElements.forEach((el2) => {
              delete el2.img.dataset.relativeX;
              delete el2.img.dataset.relativeY;
              delete el2.img.dataset.attachedTo;
            });
          }
          document.removeEventListener("mousemove", el.moveHandler);
          document.removeEventListener("mouseup", el.upHandler);
        };
        document.addEventListener("mousemove", el.moveHandler);
        document.addEventListener("mouseup", el.upHandler);
      }
      updateCursorStyle(img, true);
    });

    img.addEventListener("touchstart", function (e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      img.dispatchEvent(mouseEvent);
    });

    img.addEventListener("touchmove", function (e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      document.dispatchEvent(mouseEvent);
    });

    img.addEventListener("touchend", function (e) {
      e.preventDefault();
      const mouseEvent = new MouseEvent("mouseup");
      document.dispatchEvent(mouseEvent);
    });

    img.addEventListener("dblclick", function (e) {
      e.preventDefault();
      if (confirm("Delete this element?")) {
        draggableElements.forEach((el) => {
          if (el.img.dataset.attachedTo === img.id) {
            delete el.img.dataset.attachedTo;
            if (el.state.group) {
              const grp = el.state.group;
              document.body.appendChild(el.img);
              el.img.style.left = `${
                parseFloat(grp.style.left) + parseFloat(el.img.style.left)
              }px`;
              el.img.style.top = `${
                parseFloat(grp.style.top) + parseFloat(el.img.style.top)
              }px`;
              el.state.group = null;
            }
          }
        });
        if (state.group) {
          const grp = state.group;
          document.body.removeChild(grp);
          state.group = null;
        }
        draggableElements.delete(
        Array.from(draggableElements).find((el) => el.img === img)
        );
        img.remove();
      }
    });
  } else {
    img.addEventListener("touchstart", function (e) {
      e.preventDefault();
      const touch = e.touches[0];
      const el = Array.from(draggableElements).find((el) => el.img === img);
      if (el) {
        el.isDragging = true;
        const center = getCenter(img);
        el.state.offsetX = touch.clientX - center.x;
        el.state.offsetY = touch.clientY - center.y;
      }
    });

    img.addEventListener("touchmove", function (e) {
      e.preventDefault();
      const touch = e.touches[0];
      const el = Array.from(draggableElements).find((el) => el.img === img);
      if (el && el.isDragging) {
        const newX = touch.clientX - el.state.offsetX;
        const newY = touch.clientY - el.state.offsetY;
        img.style.left = `${newX}px`;
        img.style.top = `${newY}px`;
      }
    });

    img.addEventListener("touchend", function (e) {
      e.preventDefault();
      const el = Array.from(draggableElements).find((el) => el.img === img);
      if (el) el.isDragging = false;
    });

    img.addEventListener("click", function (e) {
      e.preventDefault();
      const currentLeft = parseFloat(img.style.left);
      const currentTop = parseFloat(img.style.top);
      if (!state.isLoaded) {
        img.src = "SlipBot_Loaded.png";
        img.dataset.scaleMultiplier = 0.9;
        state.isLoaded = true;
      } else {
        img.src = "Slipbot.png";
        img.dataset.scaleMultiplier = 1;
        state.isLoaded = false;
      }
      img.onload = function () {
        const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
        const oldCenter = getCenter(img);
        img.style.width = `${img.naturalWidth * objectScale * multiplier}px`;
        img.style.height = `${img.naturalHeight * objectScale * multiplier}px`;
        const newCenter = getCenter(img);
        img.style.left = `${currentLeft - (newCenter.x - oldCenter.x)}px`;
        img.style.top = `${currentTop - (newCenter.y - oldCenter.y)}px`;
      };
    });
  }

  draggableElements.add({
    img,
    isDragging: false,
    state,
    moveHandler: null,
    upHandler: null,
  });
  document.body.appendChild(img);
  return img;
}

function updateZIndex(element) {
  if (!isMobile) {
    if (element.src) {
      const src = element.src;
      if (isTruckSrc(src)) element.style.zIndex = Z_INDEX_LAYERS.TRUCK;
      else if (isForkliftSrc(src)) element.style.zIndex = Z_INDEX_LAYERS.FORKLIFT;
      else if (isSlipbotSrc(src)) element.style.zIndex = Z_INDEX_LAYERS.BOT;
      else if (isStuffSrc(src)) element.style.zIndex = Z_INDEX_LAYERS.STUFF;
    } else {
      element.style.zIndex = element.dataset.transportable
        ? Z_INDEX_LAYERS.TRANSPORTABLE_SQUARE
        : Z_INDEX_LAYERS.SQUARE;
    }
    maxZIndex = Math.max(maxZIndex, parseInt(element.style.zIndex));
  }
}

function rotateElement(element, degrees) {
  const center = getCenter(element);
  element.style.transition = "transform 0.1s ease";
  element.style.transform = `rotate(${degrees}deg)`;
  const newCenter = getCenter(element);
  const dx = newCenter.x - center.x;
  const dy = newCenter.y - center.y;
  const currentLeft = parseFloat(element.style.left) || 0;
  const currentTop = parseFloat(element.style.top) || 0;
  element.style.left = `${currentLeft - dx}px`;
  element.style.top = `${currentTop - dy}px`;
}

let backgroundImage = null;

document.addEventListener("DOMContentLoaded", function () {
  if (isMobile) {
    const msg = document.getElementById("mobile-message");
    if (msg) msg.style.display = "flex";
    const event = {
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2,
    };
    addDraggableImage("Slipbot.png", event, true);
  } else {
    const bgUpload = document.getElementById("backgroundUpload");
    if (bgUpload) {
      bgUpload.addEventListener("change", function (e) {
        if (e.target.files.length > 0) addBackgroundImage(e.target.files[0]);
      });
    }

    const addBotBtn = document.getElementById("addBotBtn");
    if (addBotBtn) {
      addBotBtn.addEventListener("click", function (e) {
        addDraggableImage("Slipbot.png", e);
      });
    }

    const addTrlrBtn = document.getElementById("addtrlrBtn");
    if (addTrlrBtn) {
      addTrlrBtn.addEventListener("click", function (e) {
        addDraggableImage("truck_side.png", e);
      });
    }

    const addForkliftBtn = document.getElementById("addForkliftBtn");
    if (addForkliftBtn) {
      addForkliftBtn.addEventListener("click", function (e) {
        addDraggableImage("forklift.png", e);
      });
    }

    const addStuffBtn = document.getElementById("addStuffBtn");
    if (addStuffBtn) {
      addStuffBtn.addEventListener("click", function (e) {
        addDraggableImage("stuff.png", e);
      });
    }

    const addDrawBtn = document.getElementById("addDrawBtn");
    if (addDrawBtn) {
      addDrawBtn.addEventListener("click", startSquareDrawing);
    }

    const helpBtn = document.getElementById("helpBtn");
    if (helpBtn) {
      helpBtn.addEventListener("click", () => {
        const helpText = `
Here's how to use it:
- Upload a background by pressing button and choosing image
- Add a bot for use in scaling set-up
- Toggle Scale 'On' and use mouse wheel to scale bot to image
- Add more bots, etc. w/ buttons
- Click and drag to move things around
- Use the mouse wheel to rotate
- Double-click to remove items
- Right-click Truck to turn around
- Right-click Bot to load and unload
`.trim();

        const popup = document.createElement("div");
        popup.classList.add("help-popup");
        popup.innerHTML = `
          <button class="close-btn">×</button>
          <h3>SlipBot Simulator Guide</h3>
          <pre>${helpText}</pre>
        `;
        document.body.appendChild(popup);
        popup.querySelector(".close-btn").addEventListener("click", () => {
          popup.remove();
        });
      });
    }

    document.body.addEventListener("wheel", function (e) {
      e.preventDefault();
      const toggleEl = document.getElementById("backgroundToggle");
      const toggle = !!(toggleEl && toggleEl.checked);
      if (toggle) {
        const delta = Math.sign(e.deltaY) * 0.05;
        objectScale *= 1 + delta;
        objectScale = Math.max(0.1, Math.min(5, objectScale));
        draggableElements.forEach((el) => {
          if (el.img.src) {
            const img = el.img;
            const multiplier = parseFloat(img.dataset.scaleMultiplier) || 1;
            const currentWidth = img.naturalWidth * objectScale * multiplier;
            const currentHeight = img.naturalHeight * objectScale * multiplier;
            const centerBefore = getCenter(img);
            img.style.width = `${currentWidth}px`;
            img.style.height = `${currentHeight}px`;
            const centerAfter = getCenter(img);
            const dx = centerAfter.x - centerBefore.x;
            const dy = centerAfter.y - centerBefore.y;
            img.style.left = `${parseFloat(img.style.left) - dx}px`;
            img.style.top = `${parseFloat(img.style.top) - dy}px`;
            if (isSlipbotSrc(img.src) && pixelToFeetRatio !== null) {
              pixelToFeetRatio =
                17 / (img.naturalHeight * objectScale * multiplier);
            }
          }
        });
        updateAllSquareDimensions();
      }
    });

    const bgToggle = document.getElementById("backgroundToggle");
    if (bgToggle) {
      bgToggle.addEventListener("change", function (e) {
        if (backgroundImage)
          backgroundImage.style.zIndex = e.target.checked ? "1" : "-1";
      });
    }

    document.addEventListener("click", function (e) {
      if (!e.target.classList.contains("draggable")) {
        draggableElements.forEach((el) => {
          if (el.isDragging) {
            document.removeEventListener("mousemove", el.moveHandler);
            document.removeEventListener("mouseup", el.upHandler);
            el.isDragging = false;
            if (el.img.src) updateCursorStyle(el.img, false);
          }
        });
      }
      document.body.style.cursor = "crosshair";
    });

    document.addEventListener("mouseleave", function () {
      draggableElements.forEach((el) => {
        if (el.isDragging) {
          document.removeEventListener("mousemove", el.moveHandler);
          document.removeEventListener("mouseup", el.upHandler);
          el.isDragging = false;
          if (el.img.src) updateCursorStyle(el.img, false);
        }
      });
    });

    document.body.style.cursor = "crosshair";
  }
}); 

function addBackgroundImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    if (backgroundImage) backgroundImage.remove();
    backgroundImage = document.createElement("img");
    backgroundImage.src = e.target.result;
    backgroundImage.classList.add("background-image");
    backgroundImage.style.position = "absolute";
    backgroundImage.style.left = "50%";
    backgroundImage.style.top = "60px";
    backgroundImage.style.transform = "translate(-50%, 0)";
    backgroundImage.style.opacity = "0";
    backgroundImage.style.pointerEvents = "none";
    document.body.appendChild(backgroundImage);
    backgroundImage.onload = function () {
      const headerHeight = 60;
      const safetyMargin = 10;
      const maxWidth = window.innerWidth - 2 * safetyMargin;
      const maxHeight = window.innerHeight - headerHeight - 2 * safetyMargin;
      const imgWidth = backgroundImage.naturalWidth;
      const imgHeight = backgroundImage.naturalHeight;
      const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      backgroundImage.style.width = `${imgWidth * scale}px`;
      backgroundImage.style.height = `${imgHeight * scale}px`;
      backgroundImage.style.transition = "opacity 0.3s ease";
      backgroundImage.style.opacity = "1";
      const toggle = document.getElementById("backgroundToggle");
      backgroundImage.style.zIndex = toggle && toggle.checked ? "1" : "-1";
    };
  };
  reader.readAsDataURL(file);
}

function handleAttachments(movingElement) {
  if (isMobile) return;
  const isSlipbot = movingElement.src && isSlipbotSrc(movingElement.src);
  const isTruck = movingElement.src && isTruckSrc(movingElement.src);

  if (isSlipbot) {
    const slipbotEl = Array.from(draggableElements).find(
      (el) => el.img === movingElement
    );
    if (!slipbotEl) return;

    draggableElements.forEach((el) => {
      if (
        el.img !== movingElement &&
        el.img.dataset.transportable &&
        !el.img.dataset.attachedTo
      ) {
        if (checkOverlap(movingElement, el.img)) {
          if (!slipbotEl.state.group) {
            const group = document.createElement("div");
            group.style.position = "absolute";
            group.style.left = `${parseFloat(movingElement.style.left)}px`;
            group.style.top = `${parseFloat(movingElement.style.top)}px`;
            group.style.width = `${movingElement.offsetWidth}px`;
            group.style.height = `${movingElement.offsetHeight}px`;
            group.style.transformOrigin = `${movingElement.offsetWidth / 2}px ${
              movingElement.offsetHeight / 2
            }px`;
            group.style.zIndex = Z_INDEX_LAYERS.BOT;
            group.style.willChange = "transform";

            document.body.appendChild(group);
            document.body.removeChild(movingElement);
            movingElement.style.left = "0px";
            movingElement.style.top = "0px";
            movingElement.style.transform = "";
            group.appendChild(movingElement);

            slipbotEl.state.group = group;
          }

          const group = slipbotEl.state.group;
          const botWidth = movingElement.offsetWidth;
          const botHeight = movingElement.offsetHeight;
          const squareWidth = el.img.offsetWidth;
          const squareHeight = el.img.offsetHeight;

          document.body.removeChild(el.img);
          el.img.style.left = `${(botWidth - squareWidth) / 2}px`;
          el.img.style.top = `${(botHeight - squareHeight) / 2}px`;
          el.img.style.transform = "";
          group.appendChild(el.img);

          el.img.dataset.attachedTo = movingElement.id;
          el.state.group = group;
          rotateElement(group, slipbotEl.state.rotateDeg);
        }
      }
    });
  } else if (isTruck) {
    draggableElements.forEach((el) => {
      if (
        el.img !== movingElement &&
        parseInt(el.img.style.zIndex) > parseInt(movingElement.style.zIndex)
      ) {
        const targetElement = el.state.group || el.img;
        if (checkOverlap(movingElement, targetElement)) {
          const truckLeft = parseFloat(movingElement.style.left);
          const truckTop = parseFloat(movingElement.style.top);
          const targetLeft = parseFloat(targetElement.style.left);
          const targetTop = parseFloat(targetElement.style.top);
          const relX = targetLeft - truckLeft;
          const relY = targetTop - truckTop;

          el.img.dataset.relativeX = relX;
          el.img.dataset.relativeY = relY;
          el.img.dataset.attachedTo = movingElement.id;
        }
      }
    });
  }
}

let isDrawingSquare = false;
let activeSquare = null;

function startSquareDrawing(e) {
  if (isMobile) return;
  e.stopPropagation();
  isDrawingSquare = true;
  document.body.style.cursor = "crosshair";
}

function createSquare(e) {
  if (isMobile || !isDrawingSquare) return;

  e.preventDefault();
  e.stopPropagation();

  if (pixelToFeetRatio === null) {
    alert("Please add a Slipbot first to calibrate measurements (Slipbot is 17ft tall).");
    isDrawingSquare = false;
    document.body.style.cursor = "crosshair";
    return;
  }

  const square = document.createElement("div");
  square.classList.add("draggable");
  square.style.position = "absolute";
  square.style.border = "2px solid #FF0000";
  square.style.backgroundColor = "transparent";
  square.style.left = `${e.clientX}px`;
  square.style.top = `${e.clientY}px`;
  square.style.zIndex = Z_INDEX_LAYERS.SQUARE;
  square.style.cursor = "move";
  square.style.userSelect = "none";
  square.style.willChange = "transform";

  const widthLabel = document.createElement("div");
  widthLabel.style.position = "absolute";
  widthLabel.style.top = "-20px";
  widthLabel.style.left = "50%";
  widthLabel.style.transform = "translateX(-50%)";
  widthLabel.style.color = "white";
  widthLabel.style.fontSize = "12px";
  widthLabel.style.pointerEvents = "auto";
  square.appendChild(widthLabel);

  const heightLabel = document.createElement("div");
  heightLabel.style.position = "absolute";
  heightLabel.style.left = "-40px";
  heightLabel.style.top = "50%";
  heightLabel.style.transform = "translateY(-50%)";
  heightLabel.style.color = "white";
  heightLabel.style.fontSize = "12px";
  heightLabel.style.pointerEvents = "auto";
  square.appendChild(heightLabel);

  const state = {
    offsetX: 0,
    offsetY: 0,
    startWidth: 0,
    startHeight: 0,
    startX: e.clientX,
    startY: e.clientY,
    initialLeft: 0,
    initialTop: 0,
    isDragging: false,
    resizeSide: null,
    lastWidth: 0,
    lastHeight: 0,
    widthLabel: widthLabel,
    heightLabel: heightLabel,
    isTransportable: false,
    rotateDeg: 0,
    group: null,
    labelsVisible: true,
  };

  document.body.appendChild(square);

  function drawMoveHandler(moveEvent) {
    moveEvent.preventDefault();
    moveEvent.stopPropagation();
    if (isDrawingSquare) {
      const width = Math.max(20, moveEvent.clientX - state.startX);
      const height = Math.max(20, moveEvent.clientY - state.startY);
      square.style.width = `${width}px`;
      square.style.height = `${height}px`;
      state.lastWidth = width;
      state.lastHeight = height;
      updateDimensions(square, state);
    }
  }

  function drawUpHandler(upEvent) {
    upEvent.preventDefault();
    upEvent.stopPropagation();
    if (isDrawingSquare) {
      isDrawingSquare = false;
      document.body.style.cursor = "crosshair";
      document.removeEventListener("mousemove", drawMoveHandler);
      document.removeEventListener("mouseup", drawUpHandler);
      setupSquareInteraction(square, state);
    }
  }

  document.addEventListener("mousemove", drawMoveHandler);
  document.addEventListener("mouseup", drawUpHandler);
}

function updateDimensions(square, state) {
  if (!state.labelsVisible) return;
  const widthPx = parseFloat(square.style.width);
  const heightPx = parseFloat(square.style.height);
  const widthFt = (widthPx * pixelToFeetRatio).toFixed(2);
  const heightFt = (heightPx * pixelToFeetRatio).toFixed(2);
  state.widthLabel.textContent = `${widthFt}ft`;
  state.heightLabel.textContent = `${heightFt}ft`;
}

function updateAllSquareDimensions() {
  draggableElements.forEach((el) => {
    if (!el.img.src && el.state.widthLabel && el.state.heightLabel) {
      updateDimensions(el.img, el.state);
    }
  });
}

function setupLabelEditing(label, square, state, isWidth) {
  label.addEventListener("dblclick", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.labelsVisible) return;

    const originalText = label.textContent.replace("ft", "");
    const input = document.createElement("input");
    input.type = "number";
    input.value = originalText;
    input.style.width = "50px";
    input.style.fontSize = "12px";
    input.style.position = "absolute";
    input.style.left = label.style.left;
    input.style.top = label.style.top;
    input.style.transform = label.style.transform;
    input.style.color = "black";

    square.appendChild(input);
    label.style.display = "none";
    input.focus();

    input.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter") {
        const newValue = parseFloat(input.value);
        if (!isNaN(newValue) && newValue > 0) {
          const newPx = newValue / pixelToFeetRatio;
          if (isWidth) {
            square.style.width = `${newPx}px`;
            state.lastWidth = newPx;
          } else {
            square.style.height = `${newPx}px`;
            state.lastHeight = newPx;
          }
          updateDimensions(square, state);
        }
        square.removeChild(input);
        label.style.display = "block";
      }
    });

    input.addEventListener("blur", () => {
      square.removeChild(input);
      label.style.display = "block";
    });
  });
}

function getElementAtPoint(x, y, excludeElement) {
  const elements = document.elementsFromPoint(x, y);
  return elements.filter(
    (el) =>
      el !== excludeElement &&
      el.classList.contains("draggable") &&
      el !== excludeElement.parentElement
  );
}

function setupSquareInteraction(square, state) {
  const EDGE_SIZE = 10;
  const DRAG_SMOOTHNESS = 0.5;
  const RESIZE_SENSITIVITY = 0.5;

  setupLabelEditing(state.widthLabel, square, state, true);
  setupLabelEditing(state.heightLabel, square, state, false);

  square.addEventListener("wheel", function (e) {
    if (state.isTransportable && square.dataset.attachedTo) {
      const bot = Array.from(draggableElements).find(
        (el) => el.img.id === square.dataset.attachedTo
      );
      if (bot) {
        bot.img.dispatchEvent(new WheelEvent("wheel", { deltaY: e.deltaY }));
      }
    }
  });

  square.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    activeSquare = square;

    const rect = square.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const elementsAtPoint = getElementAtPoint(e.clientX, e.clientY, square);
    const isSquareOnly = elementsAtPoint.length === 0;

    let botUnderneath = null;
    if (!isSquareOnly) {
      draggableElements.forEach((el) => {
        if (el.img.src && isSlipbotSrc(el.img.src) && checkOverlap(square, el.img)) {
          botUnderneath = el;
        }
      });
    }

    if (botUnderneath && !isSquareOnly) {
      updateZIndex(botUnderneath.img);
      bringToFront(botUnderneath.state.group || botUnderneath.img);
      botUnderneath.isDragging = true;
      const dragTarget = botUnderneath.state.group || botUnderneath.img;
      botUnderneath.state.offsetX = e.clientX - parseFloat(dragTarget.style.left);
      botUnderneath.state.offsetY = e.clientY - parseFloat(dragTarget.style.top);
      handleAttachments(botUnderneath.img);

      const moveHandler = (moveEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        if (botUnderneath.isDragging) {
          const newX = moveEvent.clientX - botUnderneath.state.offsetX;
          const newY = moveEvent.clientY - botUnderneath.state.offsetY;
          dragTarget.style.left = `${newX}px`;
          dragTarget.style.top = `${newY}px`;
        }
      };

      const upHandler = (upEvent) => {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        botUnderneath.isDragging = false;
        updateCursorStyle(botUnderneath.img, false);
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
      };

      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("mouseup", upHandler);
      updateCursorStyle(botUnderneath.img, true);
    } else if (isSquareOnly && (!state.isTransportable || !square.dataset.attachedTo)) {
      updateZIndex(square);
      bringToFront(square);
      state.startWidth = parseFloat(square.style.width) || state.lastWidth || 20;
      state.startHeight = parseFloat(square.style.height) || state.lastHeight || 20;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.initialLeft = parseFloat(square.style.left);
      state.initialTop = parseFloat(square.style.top);
      state.lastWidth = state.startWidth;
      state.lastHeight = state.startHeight; 

      if (x < EDGE_SIZE) {
        state.resizeSide = "left";
      } else if (x > rect.width - EDGE_SIZE) {
        state.resizeSide = "right";
      } else if (y < EDGE_SIZE) {
        state.resizeSide = "top";
      } else if (y > rect.height - EDGE_SIZE) {
        state.resizeSide = "bottom";
      } else {
        state.isDragging = true;
        state.offsetX = e.clientX - state.initialLeft;
        state.offsetY = e.clientY - state.initialTop;
      }

      const moveHandler = (moveEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        if (state.isDragging && activeSquare === square) {
          const targetX = moveEvent.clientX - state.offsetX;
          const targetY = moveEvent.clientY - state.offsetY;
          state.initialLeft += (targetX - state.initialLeft) * DRAG_SMOOTHNESS;
          state.initialTop += (targetY - state.initialTop) * DRAG_SMOOTHNESS;
          square.style.left = `${state.initialLeft}px`;
          square.style.top = `${state.initialTop}px`;
        } else if (state.resizeSide && activeSquare === square) {
          const dx = (moveEvent.clientX - state.startX) * RESIZE_SENSITIVITY;
          const dy = (moveEvent.clientY - state.startY) * RESIZE_SENSITIVITY;

          if (state.resizeSide === "right") {
            state.lastWidth = Math.max(20, state.startWidth + dx);
            square.style.width = `${state.lastWidth}px`;
          } else if (state.resizeSide === "left") {
            state.lastWidth = Math.max(20, state.startWidth - dx);
            square.style.width = `${state.lastWidth}px`;
            square.style.left = `${
              state.initialLeft + (state.startWidth - state.lastWidth)
            }px`;
          } else if (state.resizeSide === "bottom") {
            state.lastHeight = Math.max(20, state.startHeight + dy);
            square.style.height = `${state.lastHeight}px`;
          } else if (state.resizeSide === "top") {
            state.lastHeight = Math.max(20, state.startHeight - dy);
            square.style.height = `${state.lastHeight}px`;
            square.style.top = `${
              state.initialTop + (state.startHeight - state.lastHeight)
            }px`;
          }
          updateDimensions(square, state);
        }
      };

      const upHandler = (upEvent) => {
        upEvent.preventDefault();
        upEvent.stopPropagation();
        state.isDragging = false;
        state.resizeSide = null;
        activeSquare = null;
        square.style.cursor = "move";
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
      };

      document.addEventListener("mousemove", moveHandler);
      document.addEventListener("mouseup", upHandler);
    }
  });

  square.addEventListener("dblclick", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0, 0, 0, 0.5)";
    overlay.style.zIndex = "1000";

    const dialog = document.createElement("div");
    dialog.style.position = "absolute";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.background = "white";
    dialog.style.padding = "20px";
    dialog.style.borderRadius = "5px";
    dialog.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";

    dialog.innerHTML = "<h3>Choose an action:</h3>";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete Square";
    deleteBtn.style.margin = "10px";
    deleteBtn.style.padding = "5px 15px";
    deleteBtn.addEventListener("click", () => {
      draggableElements.delete(
        Array.from(draggableElements).find((el) => el.img === square)
      );
      if (state.group) {
        const grp = state.group;
        grp.removeChild(square);
        if (grp.children.length === 1) {
          const bot = grp.children[0];
          const botEl = Array.from(draggableElements).find((el) => el.img === bot);
          document.body.appendChild(bot);
          bot.style.left = grp.style.left;
          bot.style.top = grp.style.top;
          bot.style.transform = grp.style.transform;
          document.body.removeChild(grp);
          if (botEl) botEl.state.group = null;
        } else if (grp.children.length === 0) {
          document.body.removeChild(grp);
        }
        state.group = null;
      }
      square.remove();
      document.body.removeChild(overlay);
    });

    const labelBtn = document.createElement("button");
    labelBtn.textContent = state.labelsVisible ? "Remove Labels" : "Add Labels";
    labelBtn.style.margin = "10px";
    labelBtn.style.padding = "5px 15px";
    labelBtn.addEventListener("click", () => {
      state.labelsVisible = !state.labelsVisible;
      if (state.labelsVisible) {
        state.widthLabel.style.display = "block";
        state.heightLabel.style.display = "block";
        updateDimensions(square, state);
      } else {
        state.widthLabel.style.display = "none";
        state.heightLabel.style.display = "none";
      }
      document.body.removeChild(overlay);
    });

    if (!square.dataset.attachedTo) {
      const transportBtn = document.createElement("button");
      transportBtn.textContent = state.isTransportable
        ? "Make Non-Transportable"
        : "Make Transportable";
      transportBtn.style.margin = "10px";
      transportBtn.style.padding = "5px 15px";
      transportBtn.addEventListener("click", () => {
        if (!state.isTransportable) {
          square.dataset.transportable = "true";
          square.style.zIndex = Z_INDEX_LAYERS.TRANSPORTABLE_SQUARE;
          state.isTransportable = true;
          if (!square.id) square.id = "square_" + Date.now();
          const anySlip = Array.from(draggableElements).find((el) =>
            el.img.src ? isSlipbotSrc(el.img.src) : false
          )?.img;
          if (anySlip) handleAttachments(anySlip);
        } else {
          delete square.dataset.transportable;
          delete square.dataset.attachedTo;
          square.style.zIndex = Z_INDEX_LAYERS.SQUARE;
          state.isTransportable = false;
        }
        updateZIndex(square);
        document.body.removeChild(overlay);
      });
      dialog.appendChild(transportBtn);
    } else {
      const detachBtn = document.createElement("button");
      detachBtn.textContent = "Detach from Slipbot";
      detachBtn.style.margin = "10px";
      detachBtn.style.padding = "5px 15px";
      detachBtn.addEventListener("click", () => {
        delete square.dataset.attachedTo;
        const grp = state.group;
        if (grp) {
          document.body.appendChild(square);
          square.style.left = `${
            parseFloat(grp.style.left) + parseFloat(square.style.left)
          }px`;
          square.style.top = `${
            parseFloat(grp.style.top) + parseFloat(square.style.top)
          }px`;
          square.style.transform = "";
          state.group = null;
          if (grp.children.length === 1) {
            const bot = grp.children[0];
            const botEl = Array.from(draggableElements).find((el) => el.img === bot);
            document.body.appendChild(bot);
            bot.style.left = grp.style.left;
            bot.style.top = grp.style.top;
            bot.style.transform = grp.style.transform;
            document.body.removeChild(grp);
            if (botEl) botEl.state.group = null;
          }
        }
        document.body.removeChild(overlay);
      });
      dialog.appendChild(detachBtn);
    }

    dialog.appendChild(labelBtn);
    dialog.appendChild(deleteBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  });

  draggableElements.add({ img: square, isDragging: false, state });
}

if (!isMobile) {
  document.addEventListener("mousedown", createSquare);
}
