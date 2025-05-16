//This is the script file of Administrator page, this handles the admin logic like managing Users and Rooms etc

console.log("adminpage: script.js loaded!");

//RoomManager Class holds all the logic to Manage rooms
class RoomManager {

    //fetches room details, we make use of GraphQl to make requests to db and it returns a array.
    static async fetchRooms() {
        console.log('Inside FetchRooms');
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `query{
                            getRoomList{
                                id
                                roomName
                                description
                                members {
                                    username
                                    name
                                    role
                                }
                            }
                        }
                        `
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while fetching Rooms: ", res.errors.message);
                return []
            } else {
                return res.data.getRoomList;
            }
        } catch (error) {
            console.error("Error fetching Room List:", error);
            return [];
        }
    }

    //CreateRoom, Takes in name and description and creates room
    static async createRoom(Name, Desc) {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `mutation {
                            createRoom(input: {roomName: "${Name}", description: "${Desc}" }){
                                id
                                roomName
                                description
                            }
                        }`
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while Creating Room: ", res.errors.message);
                return null;
            } else {
                return res.data.createRoom;
            }
        } catch (error) {
            console.error("Error Creating room:", error);
            return null;
        };
    };

    //This function helps admin add Users to a room, it takes in the roomID and Username, which is sent thru a form.
    static async addMemberRoom(roomID, username) {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `mutation{
                            addMemberRoom(input: {roomID: "${roomID}", username: "${username}" }){
                                username
                                name
                                role
                            }
                        } `
                })
            });
            res = await res.json();
            if (res.data === null) {
                if (res.errors) {
                    console.error("GraphQl Error while adding user to Room: ", res.errors.message);
                    return null;
                } else {
                    alert("Member already exists");
                    return null;
                }
            } else {
                UiManager.updateRoomList();
                return res.data.addMemberRoom;
            }
        } catch (error) {
            console.error("Error occured when tried adding Member to room: ", error);
            return null;
        };
    };

    //This function removes the user from a room. roomID and Username is provided thru a form.
    static async removeMemberRoom(roomID, username) {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `mutation{
                            removeMemberRoom(input: {id: "${roomID}", username: "${username}" }){
                                username
                                name
                                role
                                inRooms
                            }
                        } `
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while Removing member from room: ", res.errors.message);
                return null;
            } else {
                return true;
            }
        } catch (error) {
            console.error("Error during Removing member: ", error);
            return null;
        };
    };

    //This function Deletes a Room, it takes in roomID it is provided dynamically thru a delete button
    static async deleteRoom(roomID) {
        console.log("deleteRoom called");
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `mutation{
                            deleteRoom(roomId: "${roomID}"){
                                id
                                roomName
                                description
                            }
                        }
                        
                        `
                })
            })
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while Deleting Room: ", res.errors.message);
                return false;
            } else {
                return true;
            }
        } catch (error) {
            console.error("Error occured when trying to delete Room", error);
            return false;
        };
    }
}

//UserManager Class holds all the logic to Manage Users
class UserManager {

    //This function helps fetch list of users from the db and returns a array.
    static async fetchUsers() {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query":
                        `query{
                            getUsersList{
                                username
                                name
                                role
                            }
                        }
                    `
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while fetching users: ", res.errors.message);
                return []
            } else {
                return res.data.getUsersList;
            }
        } catch (error) {
            console.error("Error Fetching user List:", error);
            return [];
        }
    }

    //This function helps create a new user
    static async addUser(username, name, role) {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query": `
                        mutation {
                            addUser(input: { username: "${username}", name: "${name}", role: ${role} }) {
                                username
                                name
                                role
                            }
                        }
                    `
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQl Error while creating a new users: ", res.errors.message);
                return null;
            } else {
                return res.data.addUser;
            }
        } catch (error) {
            console.error("Error adding user:", error);
            return null;
        }
    }

    //This function helps us delete a user from db
    //The "deleteUser" Graphql request also does a "removeMemberRoom" which removes the deleted user from all the Rooms.
    static async deleteUser(username) {
        try {
            let res = await fetch('/graphql', {
                method: 'POST',
                headers: { "Content-Type": 'application/json' },
                body: JSON.stringify({
                    "query": `
                        mutation{
                            deleteUser(username: "${username}"){
                                username
                                name
                                role
                            }
                        }
                    `
                })
            });
            res = await res.json();
            if (res.errors) {
                console.error("GraphQL Error while deleting user:", res.errors);
                return false;
            } else {
                return true;
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            return false;
        }
    }
}

//Class that handles all the Dynamic UI changes
class UiManager {

    //This function Updates the Room list, it updates the Room list Table and the Room Select option to add user to the room.
    static async updateRoomList() {
        const rooms = await RoomManager.fetchRooms();
        const roomListTable = document.querySelector('#roomListTable');
        const selectRoom = document.querySelector('#selectRoom');

        //logic to update the room Select option for adding user.
        selectRoom.innerHTML = `<option value="" disabled selected>Please select the Room</option>`;
        rooms.forEach(room => {
            selectRoom.innerHTML += `
                <option value="${room.id}">${room.roomName}</option>
                `
        });

        //Logic to update the room list Table to manage room, 
        //Also adds the Button to Remove user from the Room,
        //And the Button to Delete Room.
        roomListTable.innerHTML =
            `<tr>
                <th><b>Room ID</b></th>
                <th><b>Room Name</b></th>
                <th><b>Room Description</b></th>
                <th><b>Members</b></th>
            </tr>`;
        rooms.forEach(room => {
            roomListTable.innerHTML +=
                `<tr>
                   <td>${room.id}</td >
                    <td>${room.roomName}</td>
                    <td>${room.description}</td>
                    <td>${room.members.map(user => {
                    return `${user[Object.keys(user)[0]]}-${user[Object.keys(user)[1]]}
                            <button class="deleteMemberBtn" data-roomid='${room.id}' data-memberusername='${user.username}'>!!Remove member!!</button>`;
                }).join("\n")}
                    </td >
                    <td><button class="deleteBtn" value="${room.id}">!!Delete Room!!</button></td>
                <tr>`
        });
    };

    //This function Updates the User list, it updates the User list Table and the User Select option to add user to the room.
    static async updateUserList() {
        const users = await UserManager.fetchUsers();
        const userListTable = document.querySelector('#userListTable');
        const selectUser = document.querySelector('#selectUser');

        //logic to update the User Select option for adding user.
        selectUser.innerHTML = `<option value="" disabled selected>Please select the User</option>`;
        users.forEach(user => {
            selectUser.innerHTML += `
                <option value="${user.username}">${user.username}-${user.name}</option>
                `
        });

        //Logic to update the User list Table to manage User, 
        //Also adds the Button to Delete user from the DB,
        //And the Button to Delete User.
        userListTable.innerHTML =
            `<tr>
                <th><b>Username</b></th >
                <th><b>Name</b></th>
                <th><b>role</b></th>
            </tr >`;

        users.forEach(user => {
            userListTable.innerHTML +=
                `<tr>
                   <td>${user.username}</td >
                    <td>${user.name}</td>
                    <td>${user.role}</td>
                    <td><button class="deleteBtn" value="${user.username}">!!Delete User!!</button</td>
                <tr>`
        });
    }
}

//EventManager Class handles all the logic of the event triggers and forms present on teh admin page.
class EventManager {
    //This function Initializes all Event listeners and form submissions
    static setupEventListeners() {
        const createRoomForm = document.querySelector('#createRoomForm');
        const addUserForm = document.querySelector('#addUserForm');
        const userListTable = document.querySelector('#userListTable');
        const addMemberRoomForm = document.querySelector('#addMemberRoomForm');
        const roomListTable = document.querySelector('#roomListTable');

        //This is triggered when admin tries to add a user to a room,
        //it sends the request to add member to the addMemeberRoom func in RoomManager Class
        addMemberRoomForm.addEventListener('submit', async (evt) => {
            evt.preventDefault();

            const roomID = evt.target.selectRoom.value;
            const userID = evt.target.selectUser.value;
            evt.target.selectRoom.value = ''
            evt.target.selectUser.value = ''

            console.log("Add Member Clicked:", roomID, userID);

            const newMember = await RoomManager.addMemberRoom(roomID, userID);
            if (newMember) {
                alert("Member added successfully!");
            }
        });


        //This is triggered when admin tries to create a new room,
        //it Calls out the createRoom function from the RoomManager class.
        //Also it calls out UpdateRoom list to update the Room list in the admin page to manager rooms
        createRoomForm.addEventListener('submit', async (evt) => {
            evt.preventDefault();

            const roomName = evt.target.roomName.value;
            const roomDesc = evt.target.roomDesc.value;
            evt.target.roomName.value = '';
            evt.target.roomDesc.value = '';
            if (RoomManager) {
                const newRoom = await RoomManager.createRoom(roomName, roomDesc);
                if (newRoom) {
                    alert("Room Created successfully!");
                    UiManager.updateRoomList();
                }
            }
        });

        //This is triggered when admin tries to create a new User,
        //it Calls out the addUser function from the UserManager class.
        //Also it calls out UpdateUserList to update the user list in the admin page to manager Users.
        addUserForm.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            const username = evt.target.username.value;
            const name = evt.target.name.value;
            const role = evt.target.role.value;
            evt.target.username.value = '';
            evt.target.name.value = '';
            evt.target.role.value = '';
            const newUser = await UserManager.addUser(username, name, role);
            if (newUser) {
                alert("User Created successfully!");
                // const users = await UserManager.fetchUsers();
                UiManager.updateUserList();
            }
        });

        //Delete User Button
        //This Calls the deleteUser function from Usermanager
        //This also removes the Deleted user from all the Rooms it is present in
        //This also calls updateUserList and UpdateRoomList from UIManager
        userListTable.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (evt.target.classList.contains("deleteBtn")) {
                const username = evt.target.value;
                const success = await UserManager.deleteUser(username);
                // await 
                if (success) {
                    alert("!!User deleted!!")
                    // const users = await UserManager.fetchUsers();
                    UiManager.updateUserList();
                    UiManager.updateRoomList();
                }
            }
        });

        //Delete Room Button
        roomListTable.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (evt.target.classList.contains("deleteBtn")) {
                const roomID = evt.target.value;
                const success = await RoomManager.deleteRoom(roomID);
                if (success) {
                    alert("!!Room deleted!!")
                    // const users = await UserManager.fetchUsers();
                    UiManager.updateRoomList();
                }
            }
        });

        //Remove Member Button
        roomListTable.addEventListener("click", async (evt) => {
            evt.preventDefault();
            if (evt.target.classList.contains("deleteMemberBtn")) {
                // const value=JSON.parse(evt.target.value);
                // console.log(value)
                const memberroomID = evt.target.dataset.roomid;
                const memberUsername = evt.target.dataset.memberusername;

                // console.log(memberUsername, memberroomID);
                const success = await RoomManager.removeMemberRoom(memberroomID, memberUsername);
                if (success) {
                    alert("!!Member Removed!!")
                    // const users = await UserManager.fetchUsers();
                    UiManager.updateRoomList();
                }
            }
        });
    }
}

//Immediately Invoked Function Expressions That is used to Update Room and user List, and also call the event listeners initializer
(async function initApp() {
    await UiManager.updateRoomList();
    await UiManager.updateUserList();
    EventManager.setupEventListeners();
})();