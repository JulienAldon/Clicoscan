import { useNavigate } from "react-router-dom";
import AppButton from "../../components/AppButton";
import { useEffect } from "react";
import { authenticate } from "../../context/auth";
import Cookies from "js-cookie";
import styles from "./style.module.css";

function Login() {            
    return (
        <main className={styles.mainContent}>
            <div className={styles.form}>
                <h1 className={styles.title}>
                    <label>Clicoscan</label>
                    <svg class="svg-icon" className={styles.svgAccount} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 170.666667a170.666667 170.666667 0 0 1 170.666667 170.666666 170.666667 170.666667 0 0 1-170.666667 170.666667 170.666667 170.666667 0 0 1-170.666667-170.666667 170.666667 170.666667 0 0 1 170.666667-170.666666m0 426.666666c188.586667 0 341.333333 76.373333 341.333333 170.666667v85.333333H170.666667v-85.333333c0-94.293333 152.746667-170.666667 341.333333-170.666667z" fill=""/></svg>
                </h1>
                <AppButton
                    className={styles.loginButton}
                    ButtonAction={() => {
                        authenticate();
                    }}
                    >
                    <label>Login with office 365</label>
                </AppButton>
            </div>
        </main>
    );
}
export default Login;