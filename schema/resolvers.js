console.log("resolvers.js loaded successfully!");

import fs from 'fs';

const userData = JSON.parse(fs.readFileSync("./server/userDB.json", "utf-8"));
const roomData = JSON.parse(fs.readFileSync("./server/roomDB.json", "utf-8"));

const resolvers = {
    Query: {
        checkUsername: (parent, args) => {
            const userexist = userData.some(user => user.username === args.username);
            let userDetails;
            if (userexist) {
                userDetails = userData.find(user => user.username === args.username);
                return {
                    exist: userexist,
                    user: userDetails
                }
            }
            return {
                exist: userexist,
            }
        },
        getRoomList: () => roomData,
        getUsersList: () => userData,
        getUserByUsername: (parent, args) => userData.find(user => user.username === args.username),
        getRoomById: (parent, args) =>{
            // console.log("In Get Room By Id")
            const found = roomData.find(room=> room.id === args.roomId)
            // console.log(found);
            return found;
        }
        // getUserByRole: (parent, args) => userData.filter(user => user.role === args.role)
    },
    Mutation: {
        addUser: (parent, args) => {
            const newUser = {
                username: args.input.username,
                name: args.input.name,
                role: args.input.role,
                inRooms: []
            };
            const userexist = userData.some(user => user.username === newUser.username);
            if (userexist) {
                throw new Error("Username taken / User Exists. Please check the details.");
            } else {
                userData.push(newUser);
                fs.writeFileSync("./server/userDB.json", JSON.stringify(userData, null, 2));
                console.log("resolvers.js: Added user");
                return newUser;
            }
        },
        deleteUser: async (parent, args) => {
            const index = userData.findIndex(user => user.username === args.username);
            if (index === -1) {
                console.error("ERROR: User Does Not exist");
                return null;
            }
            console.log("Inrooms array looks like:", userData[index].inRooms);
            let cnt = 0;
            
            for(const room of [...userData[index].inRooms]){
                resolvers.Mutation.removeMemberRoom(null, {input:{ id: room, username: args.username }});
            };
            console.log("After Loop : Inrooms array looks like:", userData[index].inRooms);
            const deleteUser = userData.splice(index, 1);
            fs.writeFileSync("./server/userDB.json", JSON.stringify(userData, null, 2));
            console.log("Deleted user:", deleteUser);
            return deleteUser[0];
        },
        createRoom: (parent, args) => {
            const newRoom = {
                id: `${crypto.randomUUID()}`,
                roomName: args.input.roomName,
                description: args.input.description ? args.input.description : "",
                members: []
            };
            roomData.push(newRoom);
            fs.writeFileSync("./server/roomDB.json", JSON.stringify(roomData, null, 2));
            console.log("Room Created");
            return newRoom;
        },
        deleteRoom: (parent, args) => {
            const index = roomData.findIndex(room => room.id === args.roomId);
            if (index === -1) {
                console.log("Room Does not exist");
            }
            const deletedRoom = roomData.splice(index, 1);
            fs.writeFileSync("./server/roomDB.json", JSON.stringify(roomData, null, 2));
            console.log("Deleted Room:", deletedRoom);
            return deletedRoom;
        },
        addMemberRoom: (parent, args) => {
            // console.log("addMemeberRoom in resolver called with", args);
            const roomIndex = roomData.findIndex(room => room.id === args.input.roomID);
            // console.log("line 82:", roomData[roomIndex].members);
            const memberExist = roomData[roomIndex].members.findIndex(member => member.username === args.input.username);
            // console.log("line 84:", memberExist);
            if (memberExist != -1) {
                console.log("Jhingalala hoo hoo hurrrrr", memberExist);
                return null;
            }
            const userIndex = userData.findIndex(user => user.username === args.input.username);
            if (roomIndex === -1 || userIndex === -1) {
                console.log("either room or user Not found: Please refresh");
                return null;
            }
            else {
                // if (!Array.isArray(roomData[roomIndex].members)) {
                //     roomData[roomIndex].members = [];
                // }
                userData[userIndex].inRooms.push(roomData[roomIndex].id);
                fs.writeFileSync("./server/userDB.json", JSON.stringify(userData, null, 2));
                roomData[roomIndex].members.push(userData[userIndex]);
                // console.log("addMemberRoom result :", roomData);
                fs.writeFileSync("./server/roomDB.json", JSON.stringify(roomData, null, 2));
                return userData[userIndex];
            };

        },
        removeMemberRoom: (parent, args) => {
            console.log("Inside removeMemberRoom, with", args.input.id, args.input.username);
            let roomIndex = roomData.findIndex(room => room.id === args.input.id);
            if (roomIndex === -1) {
                console.log("Room Not found: Please refresh");
            } else {
                const memberIndex = roomData[roomIndex].members.findIndex(member => member.username === args.input.username);
                if (memberIndex === -1) {
                    console.log("User Not found in Room: Please refresh");
                } else {
                    const removedUser = roomData[roomIndex].members.splice(memberIndex, 1);
                    const userIndex = userData.findIndex(user => user.username === args.input.username);
                    roomIndex = userData[userIndex].inRooms.findIndex(room => room === args.input.id);
                    userData[userIndex].inRooms.splice(roomIndex, 1);
                    fs.writeFileSync("./server/userDB.json", JSON.stringify(userData, null, 2));
                    fs.writeFileSync("./server/roomDB.json", JSON.stringify(roomData, null, 2));
                    console.log(removedUser);
                    return removedUser[0];
                }
            }
        }
    }
}

export default resolvers;