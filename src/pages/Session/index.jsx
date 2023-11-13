import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import AppLoader from "../../components/AppLoader";
import styles from './style.module.css';
import AppButton from "../../components/AppButton";
import { useAuthGuard } from "../../context/auth";
import SearchBar from "../../components/SearchBar";
import RecordingButton from "../../components/RecordingButton";
import { useToast } from "../../context/toast";

function Session() {
    const context = useAuthGuard();
    const [ session, setSession ] = useState({});
    const [ errorMessage, setErrorMessage ] = useState("");
    const [ loading, setLoading ] = useState(false);
    const [ saveLoading, setSaveLoading ] = useState(false);
    const [ isScanDevice, setIsScanDevice ] = useState(false);
    const [ scanStatus, setScanStatus ] = useState(false);
    const [ currentSearch, setCurrentSearch ] = useState("");
    const [ students, setStudents ] = useState([]);
    const [ displayStudents, setDisplayStudents ] = useState([]);
    const { id } = useParams();
    const { toastList, setToastList } = useToast();
    
    const handleSearchChange = (event) => {
        setDisplayStudents(students.filter((el) => el.login.includes(event.target.value)));
        setCurrentSearch(event.target.value);
    }

    function saveSession() {
        setSaveLoading(true);
        let payload = students.filter((el) => el.status !== null || el.status !== undefined)
        console.log(payload)
        invoke("put_api_session", {students: payload, sessionId: id}).then((e) => {
            console.log(students)
            setSaveLoading(false);
            setToastList((toastList) => {return [...toastList, {
                id: "Saved",
                title: "Information",
                description: "Presence list saved",
                backgroundColor: "#08c6ff",
            }]});
        })
    }

    function scanNfcDevice(signal) {
        if (signal.aborted) {
            console.log("signal aborted")
            return signal.reason;
        }
        invoke("scan").then((e) => {
            console.log("card scanned", e) 
            if (e !== "") {
                invoke("get_email_from_id", {cardId: e}).then((z) => {
                    let elem = students.filter((el => el.login === z))
                    console.log("elem", elem);
                    selectStudentScan(elem[0]);
                }).catch((err) => {
                    console.log("err", err);
                    return err
                });
            }
            return scanNfcDevice(signal);
        }).catch((err) => {
            if (err === "No card found") {
                return scanNfcDevice(signal);
            }
            console.log("could not scan card", err)
            setScanStatus(false);
        });

        signal.addEventListener("abort", () => {
            console.log("event listener aborted")
            return signal.reason;
        });
    }

    async function findNfcDevice() {
        invoke("find_nfc_device").then((e) => {
            setIsScanDevice(true);
        }).catch((err)=>{
            setIsScanDevice(false);
            console.log(err);
        });
    }

    function getSession(id) {
        setLoading(true);
        invoke("get_api_session", {sessionId: id}).then((e) => {
            setLoading(false);
            setSession(e.session[0]);
            setStudents(e.students);
        }).catch((err) => {
            console.log("error", err);
            setLoading(false);
            setErrorMessage(err);
        })
    }
    
    function selectStudent(elem) {
        if (elem.status !== "present") {
            setToastList((toastList) => {return [...toastList, {
                id: elem.id,
                title: "Information",
                description: "Student presence set",
                backgroundColor: "#08c6ff",
            }]});
        } else {
            setToastList((toastList) => {return [...toastList, {
                id: elem.id,
                title: "Information",
                description: "Student absence set",
                backgroundColor: "#08c6ff",
            }]});
        }
        const s = students.map((stud) => {
            if (stud.id === elem.id) {
                elem.status = elem.status === "present" ? "absent" : "present";
                return elem;
            }
            return stud
        });
        setStudents([...s]);
    }

    function selectStudentScan(elem) {
        if (elem.status !== "present") {
            setToastList((toastList) => {return [...toastList, {
                id: elem.id,
                title: "Information",
                description: "Card scanned : " + elem.login,
                backgroundColor: "#08c6ff",
            }]});
        }
        const s = students.map((stud) => {
            if (stud.id === elem.id) {
                elem.status = "present";
                return elem;
            }
            return stud
        });
        setStudents([...s]);
    }

    function isPresent(elem) {
        return elem.status === "present"
    }

    useEffect(() => {
        findNfcDevice();
        getSession(id);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        if (scanStatus) { 
            scanNfcDevice(signal);
        }
        
        return () => {
            controller.abort();
        }
    }, [scanStatus]);

    useEffect(() => {
        setDisplayStudents(students.filter((el) => el.login.includes(currentSearch)));
    }, [students]);

    return (
        <main className={styles.mainContent}>
            {
                session ? 
                <div>
                    <h1>Session #{session.id} - {session.date} - {session.hour}</h1>
                    <div className={styles.commands}>
                        <SearchBar
                            placeholder={"Search Student"} 
                            description={"Search student"} 
                            onChange={handleSearchChange} 
                        />
                        <AppButton
                            className={`${styles.scanButton} ${styles.appButton}`}
                            ButtonAction={() => {
                                if (scanStatus) {
                                    setScanStatus(false);
                                } else {
                                    setScanStatus(true);
                                }
                            }}
                            disabled={!isScanDevice}
                        >
                            <label>Scan mode</label>
                            {<RecordingButton active={scanStatus}/>}
                        </AppButton>
                        <AppButton
                            className={`${styles.appButton}`}
                            ButtonAction={saveSession}
                        >
                            <label>Save</label>
                            {saveLoading ? <AppLoader style={styles.buttonLoading}></AppLoader> : <></>}
                        </AppButton>
                        {/* <AppButton
                            className={`${styles.appButton}`}
                            ButtonAction=""
                        >
                            <label>Save as CSV</label>
                        </AppButton> */}
                    </div>
                </div>
                :
                <p className={styles.errorMessage}>{errorMessage}</p>

            }

            {
                loading         ? <AppLoader></AppLoader> 
                                :
                errorMessage    ? <p className={styles.errorMessage}>{errorMessage}</p>
                                :
                <ul>
                    {
                        displayStudents.map((el) => {
                            return (
                                <li 
                                    key={el.login}
                                    onClick={(e) => {
                                        selectStudent(el);
                                    }}
                                    className={`${isPresent(el) ? styles.selected : ""}`}
                                >
                                    <label>{el.login}</label> 
                                </li>);
                            }
                        )
                    }
                </ul>
            }
        </main>
    );
}

export default Session;