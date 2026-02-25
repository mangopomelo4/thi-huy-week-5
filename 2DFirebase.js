import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update, set, push, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

let isInteracting = false;
let myName = null;
let myKey = null;
let db;
let currentTrail = [];
let lastX = -1;
let lastY = -1;

// Expose myName globally
Object.defineProperty(window, 'myName', {
  get: function() { return myName; },
  set: function(val) { myName = val; }
});
let difficultyLevel = null;

// Connect the dots data
const dotPatterns = {
    1: { // 4x4 Grid with obstacles
        dots: [
            {x: 100, y: 100, type: 'circle'}, {x: 200, y: 100, type: 'circle'}, {x: 300, y: 100, type: 'square'}, {x: 400, y: 100, type: 'circle'},
            {x: 100, y: 200, type: 'circle'}, {x: 200, y: 200, type: 'square'}, {x: 300, y: 200, type: 'circle'}, {x: 400, y: 200, type: 'circle'},
            {x: 100, y: 300, type: 'circle'}, {x: 200, y: 300, type: 'circle'}, {x: 300, y: 300, type: 'circle'}, {x: 400, y: 300, type: 'square'},
            {x: 100, y: 400, type: 'circle'}, {x: 200, y: 400, type: 'circle'}, {x: 300, y: 400, type: 'circle'}, {x: 400, y: 400, type: 'circle'}
        ],
        title: "Grid Puzzle - Level 1"
    },
    2: { // Swan - curved shape
        dots: [
            {x: 150, y: 250, type: 'circle'}, {x: 100, y: 220, type: 'circle'}, {x: 80, y: 180, type: 'circle'}, {x: 70, y: 140, type: 'circle'},
            {x: 80, y: 100, type: 'circle'}, {x: 120, y: 80, type: 'circle'}, {x: 160, y: 70, type: 'circle'}, {x: 200, y: 80, type: 'circle'},
            {x: 240, y: 100, type: 'circle'}, {x: 250, y: 140, type: 'circle'}, {x: 240, y: 180, type: 'circle'}, {x: 200, y: 220, type: 'circle'},
            {x: 150, y: 250, type: 'circle'}
        ],
        title: "Connect the Dots: Swan"
    },
    3: { // Ornamental Gate - complex shape
        dots: [
            {x: 300, y: 100, type: 'circle'}, {x: 400, y: 100, type: 'circle'}, {x: 500, y: 150, type: 'circle'}, {x: 520, y: 220, type: 'circle'},
            {x: 500, y: 290, type: 'circle'}, {x: 400, y: 340, type: 'circle'}, {x: 300, y: 340, type: 'circle'}, {x: 200, y: 290, type: 'circle'},
            {x: 180, y: 220, type: 'circle'}, {x: 200, y: 150, type: 'circle'}, {x: 250, y: 120, type: 'circle'}, {x: 300, y: 100, type: 'circle'},
            {x: 300, y: 180, type: 'circle'}, {x: 350, y: 200, type: 'circle'}, {x: 400, y: 180, type: 'circle'}, {x: 450, y: 200, type: 'circle'},
            {x: 500, y: 180, type: 'circle'}, {x: 500, y: 260, type: 'circle'}, {x: 450, y: 280, type: 'circle'}, {x: 350, y: 280, type: 'circle'},
            {x: 300, y: 260, type: 'circle'}, {x: 300, y: 100, type: 'circle'}
        ],
        title: "Connect the Dots: Ornamental Gate"
    }
};

let currentDotIndex = 0;
let connectedDots = [];

//make a folder in your firebase for this example
let appName = "thihuyweek5";
let allDrawings = {};

////FIREBASE STUFF
// YOUR Firebase (Thi Huy)
const firebaseConfig = {
  apiKey: "AIzaSyCx5bmSMOX5rzlyvK2l72OdnTO91kxoMOI",
  authDomain: "thi-huy.firebaseapp.com",

  // REQUIRED for Realtime Database:
  databaseURL: "https://thi-huy-default-rtdb.firebaseio.com",

  projectId: "thi-huy",
  storageBucket: "thi-huy.firebasestorage.app",
  messagingSenderId: "10229453813",
  appId: "1:10229453813:web:24ad3a7a678b20d8b946bc",
  measurementId: "G-50RLFQRN1E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Expose database and save functions globally
window.database = database;
window.ref = ref;
window.set = set;

window.doSave = function(level) {
    console.log('doSave called for level:', level);
    console.log('myName from window:', window.myName);
    
    const userName = window.myName;
    if (!userName) {
        alert('Please enter a name first');
        return;
    }
    
    const canvasId = 'drawingCanvas' + (level > 1 ? level : '');
    const canvas = document.getElementById(canvasId);
    console.log('Canvas found:', canvas);
    
    const imageData = canvas.toDataURL();
    console.log('Image data created, length:', imageData.length);
    
    const path = 'users/' + userName + '/drawings/level' + level;
    console.log('Saving to path:', path);
    
    try {
        const drawingRef = window.ref(window.database, path);
        console.log('Drawing ref created');
        
        window.set(drawingRef, {
            drawing: imageData,
            timestamp: new Date().toLocaleString()
        }).then(() => {
            console.log('Drawing saved successfully to Firebase');
        }).catch((error) => {
            console.error('Error saving:', error);
            alert('Error saving drawing: ' + error.message);
        });
    } catch (e) {
        console.error('Exception:', e);
        alert('Exception: ' + e.message);
    }
};

function toggleNameInput() {
    console.log('toggleNameInput called');
    const nameInput = document.getElementById('nameInput');
    console.log('nameInput element:', nameInput);
    nameInput.classList.toggle('show');
    console.log('classes after toggle:', nameInput.className);
    if (nameInput.classList.contains('show')) {
        nameInput.value = '';
        nameInput.focus();
    }
}

function submitName() {
    const nameInput = document.getElementById('nameInput');
    const inputName = nameInput.value.trim();
    
    if (inputName === '') {
        alert('Please enter a name');
        return;
    }
    
    myName = inputName;
    window.myName = myName;  // Expose to window
    if (window.setUserName) {
        window.setUserName(myName);  // Also set in inline script
    }
    console.log('Name submitted:', myName);
    
    // Move to difficulty selection
    document.getElementById('nameInputPage').classList.add('hidden');
    document.getElementById('startPage').classList.remove('hidden');
}

// Global function for inline onkeypress
window.submitNameDirect = function() {
    submitName();
};

// Set up event listeners - handle both cases where DOM might already be loaded
function setupListeners() {
    const nameLabel = document.getElementById('nameLabel');
    const nameInput = document.getElementById('nameInput');
    const difficultyCircles = document.querySelectorAll('.difficulty-circle');
    
    if (nameLabel) {
        nameLabel.addEventListener('click', toggleNameInput);
    }
    
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitName();
            }
        });
    }
    
    difficultyCircles.forEach(circle => {
        circle.addEventListener('click', (e) => {
            const level = parseInt(e.target.dataset.level);
            selectLevel(level);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupListeners);
} else {
    setupListeners();
}

window.toggleNameInputImpl = toggleNameInput;
window.submitNameImpl = submitName;

function initDotPage(level) {
    const container = document.getElementById(`dotpage${level}`);
    container.classList.add('active');
    
    const canvasWidth = 550;
    const canvasHeight = 550;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.cursor = 'crosshair';
    container.appendChild(canvas);
    
    const pattern = dotPatterns[level];
    let currentDotIndex = 0;
    let connectedDots = [];
    let isDrawing = false;
    let hoveredDot = null;
    let circleDots = pattern.dots.filter(d => d.type === 'circle');
    
    const ctx = canvas.getContext('2d');
    
    function drawDots() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw lines between connected dots
        if (connectedDots.length > 1) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(connectedDots[0].x, connectedDots[0].y);
            for (let i = 1; i < connectedDots.length; i++) {
                ctx.lineTo(connectedDots[i].x, connectedDots[i].y);
            }
            ctx.stroke();
        }
        
        // Draw all dots
        pattern.dots.forEach((dot, idx) => {
            const isConnected = connectedDots.includes(dot);
            const isHovered = hoveredDot === idx;
            
            if (dot.type === 'square') {
                // Draw obstacle square
                const size = 12;
                ctx.fillStyle = '#999';
                ctx.fillRect(dot.x - size/2, dot.y - size/2, size, size);
            } else {
                // Draw circle dot
                const radius = 8;
                ctx.fillStyle = isConnected ? '#00aa00' : isHovered ? 'rgba(153, 153, 153, 0.5)' : '#999';
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    function getDotsNearPoint(x, y, tolerance = 15) {
        return pattern.dots.map((dot, idx) => {
            const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
            return distance < tolerance ? {idx, distance, dot} : null;
        }).filter(d => d !== null).sort((a, b) => a.distance - b.distance);
    }
    
    function checkNextDot(dot) {
        // Find the index of this dot in circleDots
        const currentCircleIdx = circleDots.findIndex(d => d === dot);
        
        // Check if it's the next circle dot we need to connect
        if (currentCircleIdx === currentDotIndex) {
            return true;
        }
        return false;
    }
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const nearDots = getDotsNearPoint(x, y);
        if (nearDots.length > 0 && nearDots[0].dot.type === 'circle' && checkNextDot(nearDots[0].dot)) {
            isDrawing = true;
            connectedDots = [nearDots[0].dot];
            currentDotIndex++;
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (isDrawing) {
            const nearDots = getDotsNearPoint(x, y);
            
            // Check if we hit an obstacle
            if (nearDots.length > 0 && nearDots[0].dot.type === 'square') {
                isDrawing = false;
                alert('You hit an obstacle! Try again.');
                currentDotIndex = 0;
                connectedDots = [];
                drawDots();
                return;
            }
            
            // Check if we're over the next circle dot in sequence
            if (nearDots.length > 0 && nearDots[0].dot.type === 'circle' && checkNextDot(nearDots[0].dot)) {
                connectedDots.push(nearDots[0].dot);
                currentDotIndex++;
                
                if (currentDotIndex === circleDots.length) {
                    isDrawing = false;
                    setTimeout(() => {
                        alert('Completed! Back to start.');
                        location.reload();
                    }, 500);
                }
            }
            
            // Draw temporary line from last connected dot to mouse
            if (connectedDots.length > 0) {
                ctx.strokeStyle = '#ff6600';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(connectedDots[connectedDots.length - 1].x, connectedDots[connectedDots.length - 1].y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
        
        // Update hover state
        const nearDots = getDotsNearPoint(x, y);
        hoveredDot = nearDots.length > 0 ? nearDots[0].idx : null;
        drawDots();
    });
    
    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
        hoveredDot = null;
        drawDots();
    });
    
    drawDots();
}
                }, 500);
            }
        }
        
        drawDots();
    });
    
    drawDots();
}

showStartPage();

// Save drawing functions for each level
window.saveDrawingLevel1 = function() {
    console.log('saveDrawingLevel1 called');
    console.log('myName:', myName);
    
    if (!myName || myName === '') {
        alert('Please enter a name first');
        return;
    }
    
    const canvas = document.getElementById('drawingCanvas');
    console.log('canvas:', canvas);
    const imageData = canvas.toDataURL();
    console.log('imageData length:', imageData.length);
    
    // Transition pages immediately
    document.getElementById('drawingPage').classList.remove('active');
    document.getElementById('startPage').classList.remove('hidden');
    
    // Save to Firebase in background
    try {
        const drawingRef = ref(database, 'users/' + myName + '/drawings/level1');
        console.log('drawingRef path:', 'users/' + myName + '/drawings/level1');
        set(drawingRef, {
            drawing: imageData,
            timestamp: new Date().toLocaleString()
        }).then(() => {
            console.log('Level 1 drawing saved to Firebase');
        }).catch((error) => {
            console.error('Error saving level 1 drawing:', error);
        });
    } catch (e) {
        console.error('Exception in saveDrawingLevel1:', e);
    }
};

window.saveDrawingLevel2 = function() {
    console.log('saveDrawingLevel2 called');
    console.log('myName:', myName);
    
    if (!myName || myName === '') {
        alert('Please enter a name first');
        return;
    }
    
    const canvas = document.getElementById('drawingCanvas2');
    console.log('canvas2:', canvas);
    const imageData = canvas.toDataURL();
    console.log('imageData length:', imageData.length);
    
    // Transition pages immediately
    document.getElementById('drawingPage2').classList.remove('active');
    document.getElementById('startPage').classList.remove('hidden');
    
    // Save to Firebase in background
    try {
        const drawingRef = ref(database, 'users/' + myName + '/drawings/level2');
        console.log('drawingRef path:', 'users/' + myName + '/drawings/level2');
        set(drawingRef, {
            drawing: imageData,
            timestamp: new Date().toLocaleString()
        }).then(() => {
            console.log('Level 2 drawing saved to Firebase');
        }).catch((error) => {
            console.error('Error saving level 2 drawing:', error);
        });
    } catch (e) {
        console.error('Exception in saveDrawingLevel2:', e);
    }
};

function selectLevel(level) {
    console.log('selectLevel called with level:', level);
    difficultyLevel = level;
    
    if (level === 1) {
        // Show drawing page for level 1
        console.log('Showing drawing page 1');
        document.getElementById('startPage').classList.add('hidden');
        document.getElementById('drawingPage').classList.add('active');
        initializeDrawing();
    } else if (level === 2) {
        // Show drawing page for level 2
        console.log('Showing drawing page 2');
        document.getElementById('startPage').classList.add('hidden');
        document.getElementById('drawingPage2').classList.add('active');
        initializeDrawing2();
    } else if (level === 3) {
        // Show drawing page for level 3
        console.log('Showing drawing page 3');
        document.getElementById('startPage').classList.add('hidden');
        document.getElementById('drawingPage3').classList.add('active');
        initializeDrawing3();
    }
}

function initializeDrawing() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let drawing = false;
    
    canvas.onmousedown = (e) => {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };
    
    canvas.onmousemove = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };
    
    canvas.onmouseup = () => {
        drawing = false;
    };
    
    canvas.onmouseout = () => {
        drawing = false;
    };
}

function initializeDrawing2() {
    console.log('initializeDrawing2 called');
    const canvas = document.getElementById('drawingCanvas2');
    console.log('canvas2:', canvas);
    if (!canvas) {
        console.error('Canvas2 not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let drawing = false;
    
    canvas.onmousedown = (e) => {
        console.log('mousedown on canvas2');
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };
    
    canvas.onmousemove = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };
    
    canvas.onmouseup = () => {
        drawing = false;
    };
    
    canvas.onmouseout = () => {
        drawing = false;
    };
}

function initializeDrawing3() {
    console.log('initializeDrawing3 called');
    const canvas = document.getElementById('drawingCanvas3');
    console.log('canvas3:', canvas);
    if (!canvas) {
        console.error('Canvas3 not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let drawing = false;
    
    canvas.onmousedown = (e) => {
        console.log('mousedown on canvas3');
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };
    
    canvas.onmousemove = (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };
    
    canvas.onmouseup = () => {
        drawing = false;
    };
    
    canvas.onmouseout = () => {
        drawing = false;
    };
}

window.saveDrawing = function() {
    console.log('saveDrawing called');
    console.log('myName:', myName);
    alert('Saving drawing for: ' + myName);
    
    const canvas = document.getElementById('drawingCanvas');
    const imageData = canvas.toDataURL();
    
    if (!myName || myName === '') {
        alert('Error: Name not set');
        return;
    }
    
    // Save to Firebase
    const drawingRef = ref(database, 'drawings/level1/' + Date.now());
    set(drawingRef, {
        name: myName,
        drawing: imageData,
        timestamp: new Date().toLocaleString()
    }).then(() => {
        console.log('Drawing saved to Firebase');
        alert('Drawing saved!');
        // Go back to difficulty selection
        document.getElementById('drawingPage').classList.remove('active');
        document.getElementById('startPage').classList.remove('hidden');
    }).catch((error) => {
        console.error('Error saving drawing:', error);
        alert('Error saving drawing: ' + error.message);
    });
};

window.saveDrawingNow = function() {
    window.saveDrawing();
};

window.selectLevelDirect = function(level) {
    console.log('selectLevelDirect called with level:', level);
    selectLevel(level);
};

window.setupDrawing = function() {
    initializeDrawing();
};

window.setupDrawing2 = function() {
    initializeDrawing2();
};

window.setupDrawing3 = function() {
    initializeDrawing3();
};

// Expose selectLevel globally for inline onclick
window.selectLevelImpl = selectLevel;

function showStartPage() {
    console.log('Start page initialized');
}

function animate() {
    drawAll();
    requestAnimationFrame(animate);
}


function login() {
    const now = new Date();
    myName = now.toLocaleString();
    console.log("myName", myName);
}

function drawAll(x, y, text) {
    const ctx = document.getElementById('myCanvas').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear the canvas
    //put user name in the top right
    ctx.font = '100 30px Helvetica Neue';
    ctx.fillStyle = 'blue';
    ctx.fillText("Hello " + myName, ctx.canvas.width - 200, 30);
    for (const key in allDrawings) {
        const drawingInfo = allDrawings[key];
        let thisName = drawingInfo.name;
        if (thisName === myName) myKey = key; //keep track of your key
        ctx.stroke();
        ctx.font = '100 14px Helvetica Neue';
        ctx.strokeStyle = 'black';
        ctx.fillText(thisName, drawingInfo.location.x, drawingInfo.location.y);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawingInfo.trail[0][0][0], drawingInfo.trail[0][0][1]);
        for (let i = 1; i < drawingInfo.trail.length; i++) {
            ctx.lineTo(drawingInfo.trail[i][0], drawingInfo.trail[i][1]);
        }

    }
    //draw the current trail
    ctx.stroke();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (currentTrail.length > 0) {
        ctx.moveTo(currentTrail[0][0][0], currentTrail[0][0][1]);
        for (let i = 1; i < currentTrail.length; i++) {
            ctx.lineTo(currentTrail[i][0], currentTrail[i][1]);
        }
        console.log("drawing", currentTrail);
    }
    // ctx.stroke();
}

function initFirebase() {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    let folder = 'drawings';
    //get callbacks when there are changes either by you locally or others remotely
    const commentsRef = ref(db, appName + '/' + folder + '/');
    onChildAdded(commentsRef, (data) => {
        allDrawings[data.key] = data.val(); //adds it
        console.log("added", data.key, data.val());
        drawAll();
    });
    onChildChanged(commentsRef, (data) => {
        allDrawings[data.key] = data.val();
        console.log("changed", data.key, data.val());
        drawAll();
    });
    onChildRemoved(commentsRef, (data) => {
        console.log("removed", data.key);
        delete allDrawings[data.key]; //removes it
        drawAll();
    });
}

function setInFirebase(folder, data) {
    //firebase will supply the key,  this will trigger "onChildAdded" below
    if (myKey) {
        const dbRef = ref(db, appName + '/' + folder + '/' + myKey);
        console.log("updating", myKey);
        update(dbRef, data);
    } else {
        //if it doesn't exist, it adds (pushes) and collect the key for later updates
        const dbRef = ref(db, appName + '/' + folder + '/');
        myKey = push(dbRef, data).key;
    }
}

function initInterface() {
    // Get the input box and the canvas element
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'myCanvas');
    canvas.style.position = 'absolute';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    console.log('canvas', canvas.width, canvas.height);




    // Add event listener to the document for mouse down event
    document.addEventListener('mousedown', (event) => {
        // Set the location of the input box to the mouse location
        currentTrail = [];
        isInteracting = true;
    });
    document.addEventListener('mousemove', (event) => {
        // Set the location of the input box to the mouse location
        if (isInteracting) {
            let amountMoved = Math.abs(lastX - event.clientX) + Math.abs(lastY - event.clientY);
            if (amountMoved > 2) {
                currentTrail.push([event.clientX, event.clientY]);
                lastX = event.clientX;
                lastY = event.clientY;
            }
        }
    });
    document.addEventListener('mouseup', (event) => {

        setInFirebase('drawings', { name: myName, location: { x: event.clientX, y: event.clientY }, trail: currentTrail });
        currentTrail = [];
        isInteracting = false;
    });

}

