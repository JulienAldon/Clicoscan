// import Cookies from "js-cookie";
// import { createContext } from "preact";
// import { useState, useContext, useEffect } from "preact/hooks";

// const AuthContext = createContext(null);

// function AuthProvider(props) {
//     const [token, setToken] = useState(() => Cookies.get('token'));
//     return (<AuthContext.Provider value={token}>
//         {props.children}
//     </AuthContext.Provider>
//     );
// }

// function useAuth() {
//     const context = useContext(AuthContext);

//     // useEffect(() => {
//     //     let decodedToken = jwt_decode(context);
//     //     let currentDate = new Date();

//     //     if (decodedToken.exp * 1000 < currentDate.getTime()) {
//     //         logout()
//     //         console.log('logout because token was expired')
//     //     }
//     // }, [])

//     if (AuthContext === undefined) {
//         throw new Error ('Context Provider is missing')
//     }
//     return context;
// }

// export { useAuth, AuthProvider }