export interface UserCredential {
  username: string;
  password?: string;
  deviceLimit: number;
  displayName: string;
}

export const userCredentials: UserCredential[] = [
  {
    username: "sb715",
    password: "5317",
    deviceLimit: 3,
    displayName: "SB User 0"
  },
  {
    username: "sb0",
    password: "0000",
    deviceLimit: 3,
    displayName: "SB User 0"
  },
  {
    username: "sb539",
    password: "1234",
    deviceLimit: 3,
    displayName: "SB User 539"
  },
  {
    username: "sb1001",
    password: "7070",
    deviceLimit: 2,
    displayName: ""
  },
  {
    username: "sb499",
    password: "5585",
    deviceLimit: 5,
    displayName: "Global Admin"
  },
  {
    username: "guest",
    password: "5555",
    deviceLimit: 1,
    displayName: "Guest Member"
  },
  {
    username: "sb655",
    password: "5270",
    deviceLimit: 4,
    displayName: "Live Stream OP"
  },
  {
    username: "sb728",
    password: "4826",
    deviceLimit: 3,
    displayName: "sb728"
  }
];