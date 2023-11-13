import styles from "./style.module.css";

function RecordingButton({active}) {
    return (
        <label className={`${styles.button} ${active ? styles.Rec : styles.notRec}`}>
        </label>
    )
}

export default RecordingButton;