import { useNavigate } from "react-router-dom";
import AppButton from "../../components/AppButton";
import { authenticate, useAuth } from "../../context/auth";
import { useEffect } from "react";
import styles from "./style.module.css";

function Login() {
    const navigate = useNavigate();
    const context = useAuth();
    
    useEffect(() => {
        if (context.token) {
          navigate("/sessions");
        }
      }, [context]);
      
    return (
        <main className={styles.mainContent}>
            <div className={styles.form}>
                <h1 className={styles.title}>
                    <label>Clicoscan</label>
                    <svg className={`${styles.svgAccount}`} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 170.666667a170.666667 170.666667 0 0 1 170.666667 170.666666 170.666667 170.666667 0 0 1-170.666667 170.666667 170.666667 170.666667 0 0 1-170.666667-170.666667 170.666667 170.666667 0 0 1 170.666667-170.666666m0 426.666666c188.586667 0 341.333333 76.373333 341.333333 170.666667v85.333333H170.666667v-85.333333c0-94.293333 152.746667-170.666667 341.333333-170.666667z" fill=""/></svg>
                </h1>
                <AppButton
                    className={styles.loginButton}
                    ButtonAction={() => {
                        authenticate(context.setToken);
                    }}
                    >
                    <label>Login with office 365</label>
                </AppButton>
            </div>
        </main>
    );
}
export default Login;