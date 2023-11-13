import { useToast } from '../../context/toast';
import styles from './style.module.css';

const Toast = (props) => {
    const { position} = props;
	const { toastList, setToastList } = useToast();

    const deleteToast = id => {
        let tmp = toastList;
        let index = tmp.findIndex(e => e.id === id);
        tmp.splice(index, 1);
        setToastList([...tmp]);
    }

    return (
        <div className={`${styles.notificationContainer} ${styles.topRight}`}>
            {
                !toastList ? null :
                toastList.map((t, i) => 
                <div key={i} title={t.description} className={`${styles.notification} ${styles.toast} ${position}`} style={{ backgroundColor: t.backgroundColor }}>
                    <button onClick={() => deleteToast(t.id)}></button>
                    <div>
                        <h1 className={`${styles.notificationTitle}`}>{t.title}</h1>
                        <p className={`${styles.notificationDescription}`}>{t.description}</p>
                    </div>
                </div>
                )
            }
        </div>
    )
}
export default Toast;