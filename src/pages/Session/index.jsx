import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window'
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
    const [ scanList, setScanList ] = useState([]);

    const handleSearchChange = (event) => {
        setDisplayStudents(students.filter((el) => el.login.includes(event.target.value)));
        setCurrentSearch(event.target.value);
    }

    async function findNfcDevice() {
        invoke("find_nfc_device").then((e) => {
            setIsScanDevice(true);
        }).catch((err)=>{
            setIsScanDevice(false);
        });
    }

    function saveSession(payload) {
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
        });
    }

    function saveAllSession() {
        setSaveLoading(true);
        let payload = students.filter((el) => {
            return el.status !== null
        })
        saveSession(payload);
    }

    function getSession(id) {
        setLoading(true);
        invoke("get_api_session", {sessionId: id}).then((e) => {
            setLoading(false);
            setSession(e.session[0]);
            setStudents(e.students);
        }).catch((err) => {
            setLoading(false);
            setErrorMessage(err);
        })
    }
    
    function selectStudentScan(elem) {
        if (elem.status !== "present") {
            setToastList((toastList) => {return [...toastList, {
                id: Math.random().toString(),
                title: "Information",
                description: "Card scanned : " + elem.login,
                backgroundColor: "#08c6ff",
                deleted: false,
            }]});
        }
        const s = students.map((stud) => {
            if (stud.id === elem.id) {
                elem.status = "present";
                return elem;
            }
            return stud;
        });
        setStudents([...s]);
        saveSession([elem]);
    }

    function selectStudent(elem) {
        const s = students.map((stud) => {
            if (stud.id === elem.id) {
                elem.status = elem.status === "present" ? "absent" : "present";
                return elem;
            }
            return stud;
        });
        setStudents([...s]);
        saveSession([elem]);
    }

    function isPresent(elem) {
        return elem.status === "present";
    }

    useEffect(() => {
        findNfcDevice();
        getSession(id);
        const unlisten = listen('card-init-scan', (event) => {
            setScanStatus(false);
        });
        listen('card-scan', (event) => {
            if (event.payload.message === "error_scan") {
                setScanStatus(false);
                return;
            }
            setScanList(previous => [...previous, event.payload.message]);            
        })
        return () => {
            unlisten.then(f => f());
          }      
    }, []);

    useEffect(() => {
        let lastCard = scanList[scanList.length - 1];
        let elem = students.filter((el) => {
            return el.card === lastCard
        })
        if (elem.length > 0) {
            selectStudentScan(elem[0]);
        } else if (scanStatus) {
            setToastList((toastList) => {return [...toastList, {
                id: Math.random().toString(),
                title: "Error",
                description: "Card not found" + lastCard,
                backgroundColor: "rgba(150, 15, 15)",
                deleted: false,
            }]});
        }
    }, [scanList])

    useEffect(() => {
        if (scanStatus) {
            invoke("start_scan").then((e) => {
                setToastList((toastList) => {return [...toastList, {
                    id: Math.random().toString(),
                    title: "Information",
                    description: "Card reader started",
                    backgroundColor: "#08c6ff",
                    deleted: false,
                }]});
            });
        } else if (isScanDevice) {
            invoke("stop_scan").then((e) => {
                setToastList((toastList) => {return [...toastList, {
                    id: Math.random().toString(),
                    title: "Information",
                    description: "Card reader stopped",
                    backgroundColor: "#08c6ff",
                    deleted: false,
                }]});
            });
        }
    }, [scanStatus])

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
                            <label className={`${styles.scanLabel}`}>Scan mode</label>
                            {<RecordingButton active={scanStatus}/>}
                        </AppButton>
                        <AppButton
                            className={`${styles.appButton} ${saveStatus !== "" ? (saveStatus === "green" ? styles.green : styles.red) : ""}`}
                            ButtonAction={saveAllSession}
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