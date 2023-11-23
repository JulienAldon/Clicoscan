import { createContext } from "react";
import { useEffect, useState, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { invoke } from "@tauri-apps/api/tauri";

const AuthContext = createContext(null);

function AuthProvider(props) {
    const [token, setToken] = useState(localStorage.getItem("token"));

    useState(() => {
        console.log("auth provider", localStorage.getItem("token"))
    }, [token])
    return (<AuthContext.Provider value={{token, setToken}}>
        {props.children}
    </AuthContext.Provider>
    );
}

function logout() {
    localStorage.removeItem("token");
    window.location.replace(`/`);
}

async function authenticate(setToken) {
    invoke("authenticate").then((result) => {
        if (result != "") {
            console.log("authenticated")
            setToken(result);
            localStorage.setItem("token", result);
        }
    }).catch((err) => {
        console.log(err);
    });
}

function useAuthGuard() {
    const context = useContext(AuthContext);

    useEffect(() => {
        if (context.token === undefined && localStorage.getItem("token") === undefined) {
            logout()
            console.log('logout because token was not found.');
        }
        let decodedToken = jwtDecode(context.token);
        let currentDate = new Date();

        if (decodedToken.exp * 1000 < currentDate.getTime()) {
            logout()
            console.log('logout because token was expired');
        }
    }, [])
}

function useAuth() {
    const context = useContext(AuthContext);

    if (AuthContext === undefined) {
        throw new Error ('Context Provider is missing')
    }
    return context;
}

export { useAuth, AuthProvider, authenticate, logout, useAuthGuard }