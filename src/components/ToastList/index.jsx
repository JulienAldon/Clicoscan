import { useEffect, useState } from 'react';
import { useToast } from '../../context/toast';
import styles from './style.module.css';

const Toast = (props) => {
    const { position } = props;
	const { toastList, setToastList } = useToast();
    
    const deleteToast = id => {
        setToastList(toastList.filter(e => e.id !== id));
    }

    const markToastAsDeleted = id => {
        let newList = toastList.map((elem) => {
            elem.deleted = false;
            if (elem.id === id) {
                elem.deleted = true;
            }
            return elem
        })
        setToastList(newList);
    }

    return (
        <div className={`${styles.notificationContainer} ${styles.topRight}`}>
            {
                !toastList ? null :
                toastList.map((t) => {
                    return (
                        <div 
                            key={t.id}
                            title={t.description}
                            className={`${styles.notification} ${styles.toast} ${position} ${t.deleted ? styles.deleted : styles.created}`}
                            style={{ backgroundColor: t.backgroundColor }}
                            onAnimationEnd={() => {
                                if (t.deleted)
                                    deleteToast(t.id);
                            }}
                            onClick={() => {
                                markToastAsDeleted(t.id);
                            }}
                        >
                            <button
                                onClick={() => {
                                    markToastAsDeleted(t.id);
                                }}
                            ></button>
                            <div>
                                <h1 className={`${styles.notificationTitle}`}>{t.title}</h1>
                                <p className={`${styles.notificationDescription}`}>{t.description}</p>
                            </div>
                        </div>
                    );
                })
            }
        </div>
    )
}
export default Toast;