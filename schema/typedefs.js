console.log("typedefs.js loaded successfully!");

import {gql} from 'graphql-tag';

const typedefs = gql`
    type room{
        id: ID!
        roomName: String!
        description: String
        members: [user]!
    }
    type user{
        username: ID!
        name: String!
        role: role!
        inRooms: [String]!
    }
    type exist{
        exist: Boolean!
        user: user
    }
    input addUser{
        username: ID!
        name: String!
        role: role!
    }
    input addMember{
        roomID: ID!
        username: String!
    }
    input createRoom{
        # id: ID!
        roomName: String!
        description: String
    }
    input removeMember{
        id: ID!
        username: String!
    }
    enum role{
        Candidate
        Interviewer
        Moderator
        Admin
    }
    type Query{
        checkUsername(username: ID!): exist!
        getRoomList: [room]!
        getUsersList: [user]!
        getUserByUsername(username: ID!): user
        getRoomById(roomId: String!): room
        # getUserByRole (role: role!): user
    }
    type Mutation {
        addUser(input: addUser!): user!
        deleteUser(username: String!): user
        createRoom(input: createRoom!): room!
        deleteRoom(roomId: String!): room
        addMemberRoom(input: addMember!): user!
        removeMemberRoom(input: removeMember!): user
    }
`

export default typedefs