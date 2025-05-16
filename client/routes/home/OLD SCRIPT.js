
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector('#remoteVideo');
const chatBox = document.querySelector('#chatBox');
const sendForm = document.querySelector('#sendForm');
const joinbtn = document.querySelector('#join');
const sendBox = document.querySelector('#sendBox');
const copyBtn = document.querySelector('#copyBtn');
const copyAlert = document.querySelector('#copyAlert');
const interViewAlert = document.querySelector('#interViewAlert');
const pastRecordsBtn = document.querySelector('#pastRecordsBtn');
const pastRecordsContainer = document.querySelector('#pastRecordsContainer');
const EndbtnContainer = document.querySelector('#EndbtnContainer');
let endCallBtn;
const username = sessionStorage.getItem("username");
const Uname = sessionStorage.getItem("name");
const role = sessionStorage.getItem("role");
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let candidateUsername;
let socket;
let peerConnection;
let isRemoteUpdate = false;
Notification.requestPermission();
// let editor;
function startMonaco() {
    require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' } });
    require(['vs/editor/editor.main'], async function () {
        window.editor = monaco.editor.create(document.getElementById('editor'), {
            value: "//DO NOT CHANGE Start coding here...\n",
            automaticLayout: true
        });
        window.editor.onDidChangeModelContent(() => {
            if (isRemoteUpdate) {
                return;
            }
            console.log("onChange triggered!!!!");
            const code = editor.getValue();
            socket.send(JSON.stringify({
                type: 'code-update',
                details: {
                    username: `${username}`
                },
                code
            }));
        }
        );
        console.log("Editor made:", editor);
    })
}
function JoinInterview() {
    socket = new WebSocket(`wss://192.168.1.42:3000`);
    console.log("Web Socket Connection stablished !!");
    if (role === 'Candidate') {
        interViewAlert.innerText = "Please be patient!\nDon't refresh or close this tab, Wait for others to join!";
    };
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    socket.onopen = async () => {
        console.log("Local: Web Socket Connection Stablished");
        socket.send(JSON.stringify({
            type: 'New-Join',
            details: {
                username: `${username}`,
                Uname: `${Uname}`,
                role: `${role}`,
            }
        }));
        EndbtnContainer.innerHTML = `<button id="endCallBtn">End Call</button>`;
        endCallBtn = document.querySelector('#endCallBtn');
        endCallBtn.addEventListener('click', async (evt) => {
            evt.preventDefault();
            await socket.close();
        })
        startMonaco();
        chatBox.innerHTML += `<p><b>You Joined the chat<b></p>`
        let res;
        if (role === "Candidate") {
            res = await fetch('/updateJoined', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, "Joined": `${new Date(Date.now()).toISOString()}`
                })
            });
        };
        console.log("Fetch response:", res);
    };
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(async (stream) => {

            localVideo.srcObject = stream;

            peerConnection = new RTCPeerConnection(config);
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await socket.send(JSON.stringify({ type: 'offer', offer }));

            socket.onmessage = async ({ data }) => {
                const message = JSON.parse(data);
                if (message.type === 'New-Join') {
                    if (role !== 'Candidate') {
                        candidateUsername = message.details.username;
                        chatBox.innerHTML += `<p><b>(${message.details.role})${message.details.username} - ${message.details.Uname} Joined the chat!!</b></p>`;
                    } else {
                        chatBox.innerHTML += `<p><b>${message.details.username} - ${message.details.Uname} Joined the chat!!</b></p>`;
                    }
                }
                else if (message.type === 'offer') {
                    console.log("Offer received!!")
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socket.send(JSON.stringify({ type: 'answer', answer }));
                    if (role === 'Candidate') {
                        socket.send(JSON.stringify({ type: 'unDeclare', "cUsername": username }))
                    }
                    if (role === "Candidate") {
                        interViewAlert.innerText = '';
                        new Notification("Interview Started !");
                        res = await fetch('/updateIntStarted', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username, "intStarted": `${new Date(Date.now()).toISOString()}`
                            })
                        });
                        console.log(await res.json());
                        console.log("Update Interview sent")
                    }
                }
                else if (message.type === 'answer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
                    if (role === "Candidate") {
                        interViewAlert.innerText = '';
                        new Notification("Interview Started !");
                        res = await fetch('/updateIntStarted', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username, "intStarted": `${new Date(Date.now()).toISOString()}`
                            })
                        });
                        console.log(await res.json());
                        console.log("Update Interview sent")
                    }
                }
                else if (message.type === '') {
                    candidateUsername = message.cUsername;
                }
                else if (message.type === 'candidate') {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
                else if (message.type === 'Message') {
                    chatBox.innerHTML += `<p><b>${message.details.Uname}(${message.details.username}):</b> ${message.text}</p>`;
                }
                else if (message.type === 'code-update') {
                    isRemoteUpdate = true;
                    window.editor.setValue(message.code);
                    isRemoteUpdate = false;
                }
            };

            peerConnection.ontrack = evt => {
                remoteVideo.srcObject = evt.streams[0];
            };

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
                };
            };

        })
        .catch(err => console.error("Error accessign media:", err));
}
joinbtn.addEventListener('click', () => {
    joinbtn.setAttribute("disabled", "true");
    if (role == "Candidate") {
        setTimeout(() => {
            JoinInterview();
        }, 60000);
        new Notification("One Minute remaining!", { body: "1 Minute remaining in Interview, Be ready!" });
        setTimeout(() => {
            new Notification("30 Seconds remaining", { body: "Just 30 Seconds remaining in Interview!" });
        }, 30000);
    } else {
        JoinInterview();
    }
});
sendForm.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    const msg = await evt.target.sendBox.value;

    await socket.send(JSON.stringify({
        type: 'Message',
        details: {
            username: `${username}`,
            Uname: `${Uname}`,
            role: `${role}`
        },
        text: `${msg}`
    }))

    chatBox.innerHTML += `<p><b>You:</b>${msg}</p>`
    sendBox.value = '';
});
copyBtn.addEventListener('click', (evt) => {
    const code = window.editor.getValue();
    navigator.clipboard.writeText(code)
        .then(() => {
            setTimeout(() => {
                copyAlert.innerText = "Code Copied!";
            }, 3000);
        })
        .catch(err => {
            console.error("ERROR: Cannot Copy text:", err)
            setTimeout(() => {
                copyAlert.innerText = "XX Text not copied XX";
            });
        });
})
pastRecordsBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    console.log(candidateUsername);
    console.log("Past Button Clicked");
    if (role !== "Candidate") {
        const res = await fetch('/pastRecords', {
            method: 'GET',
            headers: { 'candidateUsername': `${candidateUsername}` }
        });
        const response = await res.json();
        console.log("RESPONSE :", response);
        pastRecordsContainer.innerHTML = response.PastRecords.map(record => {
            const key = Object.keys(record)[0];
            return `<p>${key}: ${record[key]}</p>`;
        }).join("");
    }
})
