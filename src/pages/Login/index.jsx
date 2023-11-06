import AppButton from "../../components/AppButton";
import { invoke } from "@tauri-apps/api/tauri";

async function authenticate() {
    await invoke("authenticate");
}

function Login() {    
    return (
        <main>
            <h1>Login</h1>
            <AppButton
                ButtonAction={authenticate}
                ButtonText="Login with office 365"
            ></AppButton>
        </main>
    );
}
export default Login;