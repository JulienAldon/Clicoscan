import styles from "./style.module.css";

function AppLoader({style}) {
    return (<div className={`${styles.dualRing} ${style}`}></div>);
}

export default AppLoader;