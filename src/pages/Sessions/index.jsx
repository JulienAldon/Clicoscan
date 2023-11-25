import DatePicker from "react-datepicker";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { invoke } from "@tauri-apps/api/tauri";

import SelectList from "../../components/SelectList";
import SessionsTable from "../../components/SessionsTable";
import styles from './style.module.css';
import AppLoader from "../../components/AppLoader";
import { useAuthGuard } from "../../context/auth";

function Sessions() {
    const context = useAuthGuard();
    const navigate = useNavigate();
    const [ loading, setLoading ] = useState(true);
    const [ errorMessage, setErrorMessage ] = useState("");
    const [ cityFilter, setCityFilter ] = useState("");
    const [ dateFilter, setDateFilter ] = useState(null);
    const [ dateToInclude, setDateToInclude ] = useState([]);
    const [ backData, setBackData ] = useState([]);
    const [ sessionList, setSessionList ] = useState([]);
    const [ cities, setCities] = useState([]);

    function getCities(data) {
        let res = data.map((el) => {
            return {name:el.city}
        });
        res = res.filter((value, index, array) => {
            return array.findIndex(x => x.name === value.name) === index;
        });
        return res
    }
    
    function getSessions() {
        setLoading(true);
        invoke("get_api_sessions").then((e) => {
            setBackData(e.sort((a,b) => b.id - a.id))
            setLoading(false);
        }).catch((err) => {
            console.log("error", err);
            setLoading(false);
            setErrorMessage(err);
        })
    }

    function getDates(data) {
        let res = data.map((el) => {
            let date = new Date(el.date)
            date.setHours(12);
            return date
        });
        return res;
    }

    useEffect(() => {
        getSessions()
    }, []);

    useEffect(() => {
        setSessionList(
            backData.filter((elem) => {
                let date = null;
                if (dateFilter) {
                    date = new Date(dateFilter);
                    date.setHours(12);
                }
                return (elem.city === cityFilter || cityFilter === "") && 
                        (date === null || elem.date === date.toISOString().slice(0, 10))
            })
        )
    }, [cityFilter, dateFilter, backData])

    useEffect(() => {
        setCities(getCities(backData))
        setDateToInclude(getDates(sessionList))
    }, [backData, sessionList])

    return (
        <main className={styles.mainContent}>
            <h1>All sessions</h1>
            <div className={styles.filterRow}>
                <SelectList 
                    className={styles.citySelect}
                    data={cities}
                    onChange={(el)=>{
                        if (el === null) {
                            setCityFilter("");
                            return;
                        }
                        setCityFilter(el.value);
                    }}
                />
                <DatePicker 
                    className={styles.dateSelect}
                    selected={dateFilter} 
                    onChange={(date) => setDateFilter(date)}
                    isClearable={true}
                    placeholderText="Date"
                    timeFormat="YYYY-MM-DD"
                    clearButtonClassName={styles.dateSelectClear}
                    includeDates={dateToInclude}
                />
            </div>
            
            { 
                loading      ? <AppLoader></AppLoader> 
                             : 
                errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> 
                             :
                <SessionsTable 
                    onClickRow={(id)=>{
                        navigate("/session/"+id);
                    }}
                    sessionList={sessionList}
                    sessionHead={[
                        {name: "Id", id: "id", stateIcon: ">"},
                        // {name: "City", id: "city", stateIcon: ">"},
                        {name: "Date", id: "date", stateIcon: ">"},
                        {name: "Hour", id: "hour", stateIcon: ">"},
                    ]}
                    defaultSort="id"
                />
            }
        </main>
    );
}
export default Sessions;