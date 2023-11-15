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
    const [ saveStatus, setSaveStatus ] = useState("");
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
        let payload = students.filter((el) => {
            el.late = "NULL";
            return el.status !== null
        })
        invoke("put_api_session", {students: payload, sessionId: id}).then((e) => {
            setSaveLoading(false);
            setSaveStatus("green");
            setTimeout(() => {
                setSaveStatus("");
            }, 500);
        }).catch(() => {
            setSaveLoading(false);
            setSaveStatus("red");
            setTimeout(() => {
                setSaveStatus("");
            }, 500);
        })
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
        const s = students.map((stud) => {
            if (stud.id === elem.id) {
                elem.status = elem.status === "present" ? "absent" : "present";
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

    function scanNfcDevice(signal) {
        if (signal.aborted) {
            setScanStatus(false);
            return signal.reason;
        }
        invoke("scan").then((e) => {
            if (e !== "") {
                invoke("get_email_from_id", {cardId: e}).then((z) => {
                    let elem = students.filter((el => el.login === z))
                    if (elem[0].status !== "present") {
                        selectStudentScan(elem[0]);
                    }
                }).catch((err) => {
                    return err
                });
            }
            return setTimeout(() => {
                return scanNfcDevice(signal);
            }, 400)
        }).catch((err) => {
            if (err === "No card found") {
                return setTimeout(() => {
                    return scanNfcDevice(signal);
                }, 400)
            }
            setScanStatus(false);
        });

        signal.addEventListener("abort", () => {
            setScanStatus(false);
            return signal.reason;
        });
    }

    function selectStudentScan(elem) {
        if (elem.status !== "present") {
            setToastList((toastList) => {return [...toastList, {
                id: Math.random().toString(),
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
        saveSession();
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
                            className={`${styles.appButton} ${saveStatus !== "" ? (saveStatus === "green" ? styles.green : styles.red) : ""}`}
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