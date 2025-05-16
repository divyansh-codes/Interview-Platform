//This is the script file of Dashboard page, this handles the Dashboard logic like live calling, chatting and Code Editor etc. 
console.log("homepage: script.js loaded!");

//Fetching data from session storage and storing them in globally so that we don't have to Fetch them recursively
const inRooms = JSON.parse(sessionStorage.getItem("inRooms"));
const username = sessionStorage.getItem("username");
const Uname = sessionStorage.getItem("name");
const role = sessionStorage.getItem("role");
const currRoom = null;
let isOffer = false;
let candidateUsername;

//InterviewManager Class to manage Interviews along with the live chat, Code editor etc.
class InterviewManager {

    //Default constructor to Initialize variables and configuration for WS, WebRTC and server.
    constructor() {
        this.socket = null;
        this.peerConnections = {};
        this.pc = null;
        this.isRemoteUpdate = false;
        this.config = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        };
        this.stream = null;
    }


    //Join Interview Function that, Sets Up WebSocket, WebRTC and Monaco Code editor.
    async joinInterview(username, Uname, role, Room) {

        sessionStorage.setItem("currRoom", Room); //Setting Current Room to facilitate futher Communication.
        this.socket = new WebSocket(`wss://${window.location.hostname}:3000`);

        this.socket.onerror = (error) => {
            console.error('WebSocket Error:', error)
        }

        this.socket.onopen = async () => {
            console.log("WebSocket Connection stablished!");
            console.log("Media stream set");
            // async function getMediaStream() {
            //     try {
            //         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            //         return stream;
            //     } catch (error) {
            //         alert("Camera or microphone access was denied!");
            //         return null;
            //     }
            // }
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            UiManager.setupLocalVideo(this.stream);
            UiManager.updateInterviewAlert(role);

            this.socket.send(JSON.stringify({
                type: 'New-Join',
                details: { username, Uname, role, Room }
            }));

            this.startMonacoEditor();//function call to start the Monaco Code editor
            document.querySelector("#chatBox").innerHTML += `<p><b>You Joined the chat<b></p>`

            if (role === "Candidate") { //This is a Rest Post request that Updates the Candidate's Past Records in DB 
                await fetch('/updateJoined', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, Joined: new Date().toISOString() })
                });
            }
        };

        this.socket.onmessage = async ({ data }) => {
            const msg = JSON.parse(data);
            if (['New-Join', 'Message', 'code-update'].includes(msg.type)) {
                EventManager.handleSocketMessage(msg, null);
            } else if (msg.type == "offer") {
                let peer = msg.from || msg.target;
                if (!this.peerConnections[peer]) {
                    isOffer = true;
                    this.peerConnections[peer] = await this.establishPeerConnection(msg.from);
                    isOffer = false;
                }
                EventManager.handleSocketMessage(msg, this.peerConnections[peer]);
            } else {
                let peer = msg.from || msg.target;
                EventManager.handleSocketMessage(msg, this.peerConnections[peer]);
            }
        }
    };

    //--------------------------Creates Peer Connection with every new user
    async establishPeerConnection(newUserUsername) {
        console.log("peer Connection establishPeerConnection called");
        const pc = new RTCPeerConnection(this.config);
        this.peerConnections[newUserUsername] = pc;
        if (!this.stream) {
            console.warn("Stream is missing, requesting media...", this.stream);
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            UiManager.setupLocalVideo(this.stream);
        }
        if (!this.stream instanceof MediaStream) {
            console.error("Stream is not a valid MediaStream:", this.stream);
        }
        this.stream.getTracks().forEach(track => pc.addTrack(track, this.stream));
        pc.onicecandidate = event => {
            if (event.candidate) {
                this.socket.send(JSON.stringify({ type: 'candidate', from: username, target: newUserUsername, data: event.candidate }));
            }
        };
        pc.ontrack = event => {
            UiManager.handleRemoteStream(event, newUserUsername); //sending Remote Stream received to the UI Handler which sets the remote stream to remote video
        };
        pc.oniceconnectionstatechange = () => {
            console.log("peer connection state changed!!!:", pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected') {
                const msg = {
                    type: "user-left",
                    username: newUserUsername
                };
                EventManager.handleSocketMessage(msg, pc);
            }
        };

        if (!isOffer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.send(JSON.stringify({ type: 'offer', from: username, target: newUserUsername, data: offer }));
            return pc;
        } else {
            return pc;
        }
    }

    //Monaco editor setup and Event Handlers combined in this function
    async startMonacoEditor() {
        require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@latest/min/vs' } });
        require(['vs/editor/editor.main'], () => {
            window.editor = monaco.editor.create(document.getElementById('editor'), {
                value: "//DO NOT CHANGE Start coding here...\n",
                automaticLayout: true
            });

            window.editor.onDidChangeModelContent(() => {//Handler to provide a live Interactive Coding environment to all Room members
                if (this.isRemoteUpdate) return;
                const code = editor.getValue();
                this.socket.send(JSON.stringify({ type: 'code-update', details: { username }, code }));
            });
        });
    }
};

//UiManager Class that handles the UI updates facilitating Live chat, Editor changes, Videos etc. 
class UiManager {
    static async updateLandingRoomList() {//fetches the Room list associated with the user to join the chat, video and monaco etc.
        let roomDetails = [];
        for (const room of inRooms) {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "query": `
                        query{
                            getRoomById(roomId:"${room}"){
                                id
                                roomName
                                description
                            }
                        }
                    `
                })
            });
            res = await res.json();
            roomDetails.push(res.data.getRoomById);
        };

        const selectRoom = document.querySelector('#selectRoom');
        selectRoom.innerHTML = `<option value="" disabled selected>Please select the Roomssss</option>`;
        roomDetails.forEach(room => {//Puts the Associated Rooms to the select list
            selectRoom.innerHTML += `
                <option value="${room.id}">${room.roomName}</option>
                `
        });
    }

    static setupLocalVideo(stream) {// Sets the Received local stream to local Video
        document.querySelector("#localVideo").srcObject = stream;
    };

    static handleRemoteStream(event, remoteUsername) {// Sets the Received Remote stream to Remote Video
        console.log("event: ", event, "stream: ", event.streams, "stream[0]: ", event.streams[0]);
        let videoElement = document.querySelector(`[data-stream-id="${event.streams[0].id}"]`);

        if (!videoElement) {
            console.log("Creating new remote video element for participant.");
            // Create a new video element
            videoElement = document.createElement("video");
            videoElement.className = "remoteVideo";
            videoElement.autoplay = true;
            videoElement.srcObject = event.streams[0];
            videoElement.setAttribute("data-stream-id", event.streams[0].id); // Unique identifier
            videoElement.setAttribute("data-username", remoteUsername); // Unique identifier
            document.querySelector("#remoteVideoContainer").appendChild(videoElement);
        } else {
            console.log("Updating existing remote video stream.");
            videoElement.srcObject = event.streams[0]; // Update the stream if necessary
        };
        //Making "End Call Btn"
        document.querySelector('#EndbtnContainer').innerHTML = `<button id="endCallBtn">End Call</button>`;
    };

    static updateInterviewAlert(role) {//Creates a quote for a Candidate that dissapears asap other Room members join 
        if (role === 'Candidate') {
            document.querySelector("#interViewAlert").innerText = "Don't refresh or close this tab! Wait for others to join!";
        }
    };

    static updateChatBox(message) {//Updates the chat Box with new msgs
        document.querySelector("#chatBox").innerHTML += `<p><b>${message.details.Uname}(${message.details.role}):</b> ${message.text}</p>`;
    };

    static pastRecords(records) {//Updates the Past Records Container
        document.querySelector("#pastRecordsContainer").innerHTML = records.PastRecords.map(record => {
            const key = Object.keys(record)[0];
            return `<p>${key}: ${record[key]}</p>`;
        }).join("");
    };
};

//Event Manager Class that handles all the event management like, Messages, Join/End btn clicks etc
class EventManager {
    static setupEventListeners(interviewManager) {//This function Sets up Btn event listners for, Join, end, send msg, copy code, Fetch Past records

        document.querySelector("#joinIntForm").addEventListener("submit", async (evt) => {// Join Interview Btn
            console.log(evt.target.selectRoom.value);
            evt.preventDefault();
            document.querySelector("#join").setAttribute("disabled", "true");
            if (role === 'Candidate') {
            setTimeout(async () => {//This Timeout functions does not serve any technical purpose just here to serve as a 1 minute countdown for a Candidate before Joining interview. 
            await interviewManager.joinInterview(username, Uname, role, evt.target.selectRoom.value);
            }, 30000);
            new Notification("Joining Interview in 30 seconds!", { body: "Be Prepared, You will join the interview in 30 seconds!" });
            setTimeout(() => {
            new Notification("Last Update: Joining Interview in 15 seconds", { body: "This is the last reminder. You will be joining the Interview in 15 seconds!" });
            }, 15000);
            } else {
            await interviewManager.joinInterview(username, Uname, role, evt.target.selectRoom.value);
            }
        });

        document.querySelector('#EndbtnContainer').addEventListener('click', (evt) => {//End Interview Btn

            document.querySelector("#join").disabled = false;
            document.querySelector('#EndbtnContainer').innerHTML = '';
            document.querySelector("#localVideo").srcObject = null;
            // document.querySelector("#remoteVideo").srcObject = null;
            const elements = document.querySelectorAll(".remoteVideo");
            elements.forEach(element => {
                element.remove(); // Works only if element is a <video> or <audio>
            });

            if (interviewManager.stream) {
                interviewManager.stream.getTracks().forEach(track => track.stop());
                console.log("Media tracks stopped.");
            }

            interviewManager.socket.send(JSON.stringify({
                type: "user-left",
                username: username
            }));
            console.log("Checking for peer connecitons")
            if (interviewManager.peerConnections) {
                console.log("PeerConnections found!!!")
                for (let peer in interviewManager.peerConnections) {
                    interviewManager.peerConnections[peer].close();
                }
                interviewManager.peerConnections = {};
            } else {
                console.log("PeerConnections not found!!!")
            }
            console.log("Checking for peer connecitons Complete")

            if (interviewManager.socket) {
                console.log("WebSocket Found");
                interviewManager.socket.close();
                console.log("WebSocket Closed");
            } else {
                console.log("WebSocket Not found");
            }
            alert("Call Ended Successfully!");
        });

        document.querySelector("#sendForm").addEventListener("submit", async (evt) => {//Send Message form
            evt.preventDefault();
            const msg = evt.target.sendBox.value;
            interviewManager.socket.send(JSON.stringify({
                type: 'Message',
                details: { username, Uname, role },
                text: msg
            }));
            UiManager.updateChatBox({ details: { Uname: 'You:' }, text: msg });
            evt.target.sendBox.value = '';
        });

        document.querySelector("#copyBtn").addEventListener("click", async () => {//Copy Code Btn
            const code = await window.editor.getValue();
            await navigator.clipboard.writeText(code);
            document.querySelector("#copyAlert").innerText = "Code Copied!";
        });

        document.querySelector("#pastRecordsBtn").addEventListener("click", async () => {//Past Records Btn
            if (role !== "Candidate") {
                const res = await fetch('/pastRecords', {//This fetches the Past records of the Candidate for other Members, it fethces it using Candidate's Username.
                    method: 'GET',
                    headers: { 'candidateUsername': candidateUsername }
                });
                const response = await res.json();
                UiManager.pastRecords(response);
            }
        });
    }

    static async handleSocketMessage(message, peerConnection) {//Function that Handles all the Message from Socket, msgs are forwarded here thru the Socket.onmessage from Interview manager class

        if (message.type === 'New-Join') {
            console.log("New-Join msg received", message);
            const chatBox = document.querySelector("#chatBox");
            if (message.details.role == 'Candidate') {
                candidateUsername = message.details.username;
            }
            await interviewManager.establishPeerConnection(message.details.username);
            chatBox.innerHTML += `<p><b>(${message.details.role}) ${message.details.username} - ${message.details.Uname} joined the chat!</b></p>`;
        }

        else if (message.type === 'offer') { //If the Client receives an RTC Offer we send back a Answer response to the server
            console.log("Offer received!!: ", message);
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            interviewManager.socket.send(JSON.stringify({ type: 'answer', target: message.from, data: answer }));
            if (role === 'Candidate') {//If the Current Role is Candidate then it also send the POST request to update the Interview Started in Candidate's past records
                await fetch('/updateIntStarted', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, "intStarted": `${new Date(Date.now()).toISOString()}` })
                });
            }

        }

        else if (message.type === 'answer') {//RTC Answer handler, it sets teh Remote RTC Description and also updates the Interview Started in past records if Candidate receives an answer.
            console.log("Answer received!");
            peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))
                .then(async () => {
                    if (role === 'Candidate') {
                        await fetch('/updateIntStarted', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, "intStarted": `${new Date(Date.now()).toISOString()}` })
                        });
                    }
                })
                .catch(err => console.error("Error handling answer:", err));
        }
        else if (message.type === 'code-update') {//Monaco Code Update handler
            interviewManager.isRemoteUpdate = true;//RemoteUpdate flag avoiding infinite back and forth requests
            window.editor.setValue(message.code);
            interviewManager.isRemoteUpdate = false;
        }
        else if (message.type === 'Message') {//Chat Message update handler
            UiManager.updateChatBox(message);
        }
        else if (message.type === 'candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(message.data));// Once the Remote description is set, a new Candidate is received then it finds the most Suitable and fastest RTC route. to set up PeerToPeer connection
        }
        else if (message.type === "user-left") {
            const videoEl = document.querySelector(`[data-username="${message.username}"]`);
            if (videoEl) {
                videoEl.srcObject = null;
                videoEl.remove();
            }
            if (interviewManager.peerConnections[message.username]) {
                interviewManager.peerConnections[message.username].close();
                delete interviewManager.peerConnections[message.username];
            }
            document.querySelector("#chatBox").innerHTML += `<p><b>${message.username} Diconnected!</b></p>`;
        }

    }
}

const interviewManager = new InterviewManager();//Initializing teh Class with a new object
EventManager.setupEventListeners(interviewManager); //calling out this function to setup all the event listeners
UiManager.updateLandingRoomList(); //Updateing the Room list so that the User is able to join Interview
if (Notification.permission === "granted") {
    console.log("Notifications permissions Granted");
} else if (Notification.permission === "denied") {
    console.warn("Notifications are blocked. Please enable them in settings.");
} else {
    Notification.requestPermission().then((permission) => {
        console.log(`User selected: ${permission}`);
    });
}
