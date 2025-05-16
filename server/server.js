import { fileURLToPath } from 'url';
import express from 'express';
import https from 'https';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import typedefs from '../schema/typedefs.js';
import resolvers from '../schema/resolvers.js';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import path, { dirname } from 'path';
let Joincount = 0;
let RoomList = {};
//function that setups HTTPS Express server, GraphQL server and WebSocket server.
async function serverStarter() {

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const port = 3000;
    const app = express();

    //Https server setup
    const httpsServer = https.createServer({
        key: fs.readFileSync('./server/key.pem'),
        cert: fs.readFileSync('./server/cert.pem')
    }, app);
    httpsServer.on('error', (err) => {
        console.error('HTTPS Server Error:', err);
    });

    //GraphQL server setup
    const server = new ApolloServer({
        typeDefs: typedefs,
        resolvers: resolvers
    })
    try {
        await server.start();
        console.log("Apollo Server started successfully");
    } catch (error) {
        console.error("Error starting Apollo Server:", error);
    }

    //WebSocket Server setup
    const wss = new WebSocketServer({ server: httpsServer });

    //MiddleWares setup
    app.use('/routes', express.static(path.join(__dirname, '../client/routes'))); //Loading Static Files
    app.use(express.json()); //required for Json Data Handling
    app.use(express.urlencoded({ extended: true })); //required for Form handling
    app.use('/graphql', expressMiddleware(server)); //required for GraphQL request handling

    //routes and requests
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'client', 'routes', 'landing', 'landingpage.html'));
    });
    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'client', 'routes', 'home', 'homepage.html'));
    });
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'client', 'routes', 'admin', 'adminpage.html'));
    });

    //Past records fetching thru Rest Get Request
    app.get('/pastRecords', (req, res) => {
        fs.readFile("./server/userDB.json", "utf-8", ((err, data) => {
            if (err) {
                console.error("ERROR during opening file:", err);
            } else {
                let jsonUserData = JSON.parse(data);
                const index = jsonUserData.findIndex(user => user.username === req.headers.candidateusername);
                if (index == -1) {
                    return res.status(404).json({ error: 'User does not exist in db Contact admin' });
                };
                res.send(jsonUserData[index])
            }
        }));
    });

    //Updating records thru Rest Post Request
    app.post('/updateJoined', (req, res) => {
        fs.readFile("./server/userDB.json", "utf-8", ((err, data) => {
            if (err) {
                console.error("ERROR during opening file:", err);
            } else {
                let jsonUserData = JSON.parse(data);
                const { username, Joined } = req.body;
                const index = jsonUserData.findIndex(user => user.username === username);
                if (index == -1) {
                    return res.status(404).json({ error: 'User does not exist in db Contact admin' });
                };
                jsonUserData[index].PastRecords = jsonUserData[index].PastRecords || [];
                jsonUserData[index].PastRecords.push({ joined: Joined });
                fs.writeFile("./server/userDB.json", JSON.stringify(jsonUserData, null, 2), "utf8", (err) => {
                    if (err) {
                        console.error("ERROR During saving file:", err);
                        return;
                    }
                });
                res.status(200).json({ message: "Data updated successfully" });
                // res.end();
            }
        }));
    });
    app.post('/updateIntStarted', (req, res) => {
        console.log("UPdate interview request handled")
        fs.readFile("./server/userDB.json", "utf-8", ((err, data) => {
            if (err) {
                console.error("ERROR during opening fileL", err);
            } else {
                let jsonUserData = JSON.parse(data);
                const { username, intStarted } = req.body;
                const index = jsonUserData.findIndex(user => user.username === username);
                if (index == -1) {
                    return res.status(404).json({ error: 'User does not exist in db Contact admin' });
                };
                jsonUserData[index].PastRecords.push({ 'Interview started': `${intStarted}` });

                fs.writeFile("./server/userDB.json", JSON.stringify(jsonUserData, null, 2), "utf8", (err) => {
                    if (err) {
                        console.error("ERROR During saving file:", err);
                        return;
                    }
                });
                res.status(200).json({ message: "Data updated successfully" });
            }
        }));
    });
    // let clientList = [];

    function broadcast(socket, msg) {
        console.log("Broadcast Func Called!!");
        console.log("RoomList looks like:", RoomList)
        console.log("Messag received: ", msg);
        RoomList[socket.roomId].forEach(client => {
            if (client != socket && client.readyState === 1) {
                console.log("msg sent !!");
                client.send(JSON.stringify(msg));
            }else{
                console.warn("!!NO CLIENT FOUND!!");
            }
        });
    };

    wss.on("connection", (socket) => {
        // clientList.push(socket);
        socket.on("message", message => {
            try {
                const msg = JSON.parse(message);
                if (msg.type === 'New-Join') {
                    console.log("New Join Msg Received in server")
                    Joincount++
                    const roomID = msg.details.Room;
                    socket.roomId = roomID;
                    socket.username = msg.details.username;
                    if (RoomList[roomID]) {
                        RoomList[roomID].push(socket);
                        console.log("New socket:", Joincount," added to RoomList")
                    } else {
                        RoomList[roomID] = [];
                        console.log("New RoomList empty array created:",RoomList)
                        RoomList[roomID].push(socket);
                        console.log("New socket:", Joincount," added to RoomList")
                    }
                    broadcast(socket, msg);
                }
                else if (['offer', 'answer', 'candidate'].includes(msg.type)) {
                    if(msg.type === 'offer'){
                        console.log("Offer received");
                    }
                    else if(msg.type === 'answer'){
                        console.log("answer received");
                    }
                    else if(msg.type === 'candidate'){
                        console.log("candidate received");
                    }
                    const targetUsername = msg.target;
                    const room = RoomList[socket.roomId];
                    const targetSocket = room.find(user => user.username === targetUsername);
                    console.log("target socket :",targetSocket.username);
                    if (targetSocket && targetSocket.readyState === 1) {
                        console.log("Message sent to: Target socket")
                        targetSocket.send(JSON.stringify({
                            type: msg.type,
                            from: socket.username,
                            data: msg.data
                        }));
                    }
                }else{
                    broadcast(socket, msg);
                }
                // else if (['offer', 'answer', 'candidate'].includes(type)) {
                //     // Relay WebRTC signaling messages to the target user
                //     const targetUsername = msg.target;
                //     const room = RoomList[socket.roomId] || [];

                //     const targetSocket = room.find(client => client.username === targetUsername);
                //     if (targetSocket && targetSocket.readyState === 1) {
                //         targetSocket.send(JSON.stringify({
                //             type,
                //             from: socket.username,
                //             data: msg.data
                //         }));
                //     }
                // }

            } catch (error) {
                console.error('Error Parsing message:', error);
            }
        })

        socket.on("close", () => {
            if (socket.roomId && RoomList[socket.roomId]) {
                RoomList[socket.roomId] = RoomList[socket.roomId].filter(c => c !== socket);
                console.log(socket.username," Client disconnected!!");
            }
        })
    })
    httpsServer.listen(port, () => {
        console.log(`server is listening at on https://192.168.1.42:${port}`)
        console.log(`server is listening at on https://192.168.1.5:${port}`)
    })
}
serverStarter();