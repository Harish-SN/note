const addNoteBtn = document.getElementById('addNote');
const toggleThemeBtn = document.getElementById('toggleTheme');
const toggleParticlesBtn = document.getElementById('toggleParticles');
const notesContainer = document.getElementById('notesContainer');

let notes = JSON.parse(localStorage.getItem('notes')) || [];
let zIndexCounter = Math.max(1, ...notes.map(n => n.zIndex || 1));
const colors = ["#fff8b0", "#ffd6a5", "#a0e7e5", "#b4f8c8", "#d0f4de", "#ffd966"];
const snapSize = 20;
let selectedNote = null;
let particlesEnabled = localStorage.getItem('particles') !== 'false';

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
}

toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
    localStorage.setItem(
        'theme',
        document.body.classList.contains('dark') ? 'dark' : 'light'
    );
});

if (toggleParticlesBtn) {
    toggleParticlesBtn.addEventListener('click', () => {
        particlesEnabled = !particlesEnabled;
        localStorage.setItem('particles', particlesEnabled);
    });
}

function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function snap(value) {
    return Math.round(value / snapSize) * snapSize;
}

document.addEventListener('mousemove', e => {
    const offsetX = (e.clientX - window.innerWidth / 2) / 50;
    const offsetY = (e.clientY - window.innerHeight / 2) / 50;
    addNoteBtn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
});

function applyTiltShadow(noteDiv, dx, dy) {
    const tiltX = Math.min(Math.max(-15, dy / 10), 15);
    const tiltY = Math.min(Math.max(-15, -dx / 10), 15);
    const shadowX = Math.min(Math.max(-20, dx / 2), 20);
    const shadowY = Math.min(Math.max(-20, dy / 2), 20);
    noteDiv.style.transform =
        `translate(0,0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;
    noteDiv.style.boxShadow =
        `${shadowX}px ${shadowY}px 50px rgba(0,0,0,0.6)`;
}

function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.classList.add('note');
    if (note.pinned) noteDiv.classList.add('pinned');
    if (note.minimized) noteDiv.classList.add('minimized');

    noteDiv.style.top = note.top + "px";
    noteDiv.style.left = note.left + "px";
    noteDiv.style.width = note.width + "px";
    noteDiv.style.height = note.height + "px";
    noteDiv.style.background = note.color;
    noteDiv.style.zIndex = note.zIndex;
    noteDiv.style.color = "#000";

    const topButtons = document.createElement('div');
    topButtons.classList.add('top-buttons');

    const pinBtn = document.createElement('button'); pinBtn.textContent = "📌";
    const colorBtn = document.createElement('button'); colorBtn.textContent = "🎨";
    const minimizeBtn = document.createElement('button');
    const duplicateBtn = document.createElement('button'); duplicateBtn.textContent = "⎘";
    const deleteBtn = document.createElement('button'); deleteBtn.textContent = "✖";

    minimizeBtn.textContent = note.minimized ? "⬜" : "➖";

    topButtons.append(
        pinBtn,
        colorBtn,
        minimizeBtn,
        duplicateBtn,
        deleteBtn
    );
    noteDiv.appendChild(topButtons);

    const textarea = document.createElement('textarea');
    textarea.value = note.text;
    noteDiv.appendChild(textarea);

    const resizeHandle = document.createElement('div');
    resizeHandle.classList.add('resize-handle');
    noteDiv.appendChild(resizeHandle);

    let isDragging = false, startX, startY, startLeft, startTop;

    const startDrag = (x, y) => {
        selectedNote = noteDiv;
        isDragging = true;
        startX = x; startY = y;
        startLeft = parseInt(noteDiv.style.left);
        startTop = parseInt(noteDiv.style.top);
        noteDiv.style.cursor = "grabbing";
        noteDiv.style.transition = "transform 0.05s ease";
        noteDiv.classList.add('dragging');
        noteDiv.style.zIndex = ++zIndexCounter;
        note.zIndex = zIndexCounter;
    };

    const drag = (x, y) => {
        if (!isDragging) return;
        const dx = x - startX, dy = y - startY;
        const newLeft = snap(startLeft + dx);
        const newTop = snap(startTop + dy);
        noteDiv.style.left = newLeft + "px";
        noteDiv.style.top = newTop + "px";
        note.left = newLeft;
        note.top = newTop;
        applyTiltShadow(noteDiv, dx, dy);
    };

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        noteDiv.style.cursor = "grab";
        noteDiv.style.transition =
            "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
        noteDiv.style.transform = "translate(0,0)";
        noteDiv.style.boxShadow = "0 10px 28px rgba(0,0,0,0.5)";
        noteDiv.classList.remove('dragging');
        saveNotes();
    };

    noteDiv.addEventListener('mousedown', e => {
        if (![textarea, deleteBtn, colorBtn, pinBtn, duplicateBtn, minimizeBtn, resizeHandle]
            .includes(e.target)) {
            startDrag(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mousemove', e => drag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    let isResizing = false;
    let resizeStartX, resizeStartY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', e => {
        if (note.minimized) return;
        e.stopPropagation();
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        startWidth = noteDiv.offsetWidth;
        startHeight = noteDiv.offsetHeight;
        document.body.style.cursor = "nwse-resize";
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const newWidth = Math.max(160, startWidth + (e.clientX - resizeStartX));
        const newHeight = Math.max(110, startHeight + (e.clientY - resizeStartY));
        noteDiv.style.width = newWidth + "px";
        noteDiv.style.height = newHeight + "px";
        note.width = newWidth;
        note.height = newHeight;
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.cursor = "default";
        saveNotes();
    });

    deleteBtn.onclick = () => {
        noteDiv.style.transition = "all 0.5s ease";
        noteDiv.style.transform = "scale(0)";
        noteDiv.style.opacity = "0";
        setTimeout(() => {
            notes = notes.filter(n => n.id !== note.id);
            saveNotes();
            noteDiv.remove();
        }, 500);
    };

    colorBtn.onclick = () => {
        note.color = colors[Math.floor(Math.random() * colors.length)];
        noteDiv.style.background = note.color;
        saveNotes();
    };

    pinBtn.onclick = () => {
        note.pinned = !note.pinned;
        noteDiv.classList.toggle('pinned');
        saveNotes();
    };

    duplicateBtn.onclick = () => {
        const newNote = {
            ...note,
            id: Date.now(),
            top: note.top + 30,
            left: note.left + 30,
            zIndex: ++zIndexCounter
        };
        notes.push(newNote);
        saveNotes();
        createNoteElement(newNote);
    };

    minimizeBtn.onclick = () => {
    note.minimized = !note.minimized;
    noteDiv.classList.toggle('minimized');

    if (note.minimized) {
        note._prevHeight = noteDiv.style.height;
        note._prevMinHeight = noteDiv.style.minHeight;

        noteDiv.style.height = "auto";
        noteDiv.style.minHeight = "unset";
    } else {
        noteDiv.style.height = note._prevHeight || note.height + "px";
        noteDiv.style.minHeight = note._prevMinHeight || "";
    }

    minimizeBtn.textContent = note.minimized ? "⬜" : "➖";
    saveNotes();
    };

    textarea.oninput = e => {
        note.text = e.target.value;
        saveNotes();
    };

    let lastWidth = note.width, lastHeight = note.height;
    new ResizeObserver(() => {
        if (note.minimized) return;
        const w = noteDiv.offsetWidth;
        const h = noteDiv.offsetHeight;
        if (w !== lastWidth || h !== lastHeight) {
            note.width = w;
            note.height = h;
            lastWidth = w;
            lastHeight = h;
            saveNotes();
        }
    }).observe(noteDiv);

    notesContainer.appendChild(noteDiv);
}

addNoteBtn.onclick = () => {
    const newNote = {
        id: Date.now(),
        text: "",
        top: 60 + Math.random() * 200,
        left: 60 + Math.random() * 400,
        width: 240,
        height: 150,
        color: colors[Math.floor(Math.random() * colors.length)],
        zIndex: ++zIndexCounter,
        pinned: false,
        minimized: false
    };
    notes.push(newNote);
    saveNotes();
    createNoteElement(newNote);
};

notes.forEach(createNoteElement);

document.addEventListener('keydown', e => {
    if (!selectedNote) return;
    const note = notes.find(n =>
        n.zIndex === parseInt(selectedNote.style.zIndex)
    );
    if (!note) return;

    if (e.key === "Delete") {
        notes = notes.filter(n => n.id !== note.id);
        saveNotes();
        selectedNote.remove();
        selectedNote = null;
    }

    if (e.ctrlKey && e.key.toLowerCase() === "d") {
        const newNote = {
            ...note,
            id: Date.now(),
            top: note.top + 30,
            left: note.left + 30,
            zIndex: ++zIndexCounter
        };
        notes.push(newNote);
        saveNotes();
        createNoteElement(newNote);
    }
});

const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
});

let particles = [];
const particleCount = 160;

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 1 + Math.random() * 3,
            dx: -0.5 + Math.random(),
            dy: -0.5 + Math.random(),
            alpha: 0.2 + Math.random() * 0.5,
            orbit: null,
            angle: Math.random() * Math.PI * 2,
            speed: 0.01 + Math.random() * 0.02,
            trail: []
        });
    }
}
initParticles();

function animateParticles() {
    if (!particlesEnabled) return requestAnimationFrame(animateParticles);

    ctx.fillStyle =
        document.body.classList.contains('dark')
            ? 'rgba(18,18,18,0.2)'
            : 'rgba(248,249,250,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const noteRects = [...document.querySelectorAll('.note')]
        .map(n => {
            const r = n.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });

    for (let p of particles) {
        let near = noteRects.find(n =>
            Math.hypot(p.x - n.x, p.y - n.y) < 120
        );

        if (near) {
            if (!p.orbit) {
                p.orbit = {
                    x: near.x,
                    y: near.y,
                    radius: 30 + Math.random() * 50,
                    angle: p.angle,
                    speed: 0.02 + Math.random() * 0.02
                };
            }
            p.orbit.x = near.x;
            p.orbit.y = near.y;
            p.orbit.angle += p.orbit.speed;
            p.x = p.orbit.x + Math.cos(p.orbit.angle) * p.orbit.radius;
            p.y = p.orbit.y + Math.sin(p.orbit.angle) * p.orbit.radius;
        } else {
            p.orbit = null;
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        }

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 15) p.trail.shift();

        for (let i = 0; i < p.trail.length; i++) {
            const t = p.trail[i];
            const a = (i + 1) / p.trail.length * (p.orbit ? 1 : p.alpha);
            ctx.beginPath();
            ctx.arc(t.x, t.y, p.r * (i / 15 + 0.3), 0, Math.PI * 2);
            ctx.fillStyle =
                document.body.classList.contains('dark')
                    ? `rgba(255,255,255,${a})`
                    : `rgba(50,50,50,${a})`;
            ctx.fill();
        }
    }

    requestAnimationFrame(animateParticles);
}

animateParticles();