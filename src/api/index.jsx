// Get Sessions
// Get Session data
// Put session status

import config from "../config.jsx";

function read_sessions() {
    return fetch(`${config}/sessions`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
    });
}