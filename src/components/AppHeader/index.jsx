import styles from './style.module.css';
import { useAuth, logout } from '../../context/auth';

function AppHeader() {
    const context = useAuth();

    return (
       <>
        {    
            context 
            ?  <header>
            <a className={styles.navButton} href="/sessions">Sessions</a>
            <button className={styles.navButton} onClick={logout}>Logout</button>
            </header>
            : <></>
        }
        </>
    );
}
export default AppHeader;