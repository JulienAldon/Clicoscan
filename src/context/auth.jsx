import Cookies from "js-cookie";
import { createContext } from "react";
import { useEffect, useState, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { invoke } from "@tauri-apps/api/tauri";

const AuthContext = createContext(null);

function AuthProvider(props) {
    const [token, setToken] = useState(Cookies.get('token'));

    useState(() => {
        console.log("auth provider", Cookies.get('token'))
    }, [token])
    return (<AuthContext.Provider value={token}>
        {props.children}
    </AuthContext.Provider>
    );
}

function logout() {
    Cookies.remove('token');
	window.location.replace(`/`);
}

async function authenticate() {
    invoke("authenticate").then((result) => {
        if (result != "") {
            Cookies.set('token', result);
            window.location.replace('/sessions');
        }
    }).catch((err) => {
        console.log(err);
    });
   
}

function useAuthGuard() {
    const context = Cookies.get('token');

    useEffect(() => {
        if (context === undefined) {
            logout()
            console.log('logout because token was not found.');
        }
        let decodedToken = jwtDecode(context);
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