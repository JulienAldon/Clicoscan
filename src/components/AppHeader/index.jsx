import styles from './style.module.css';
import { useAuth, logout } from '../../context/auth';
import { useNavigate } from 'react-router-dom';

function AppHeader() {
    const navigate = useNavigate();
    const context = useAuth();

    return (
       <>
        {    
            context.token 
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