import Td from '../LinkTableRow';
import { useState, useEffect } from "react";
import styles from './style.module.css';
import { useNavigate } from "react-router-dom";

const SessionsTable = ({onClickRow, sessionList, sessionHead, defaultSort="id"}) => {
    const [ sortedList, setSortedList ] = useState([...sessionList]);
    const [ tableHeadData, setTableHeadData ] = useState([...sessionHead]);
    const navigate = useNavigate();
    function setHeadStateIcon(table, icon, elem) {
        let newTable = table.map((el => {
            return {...el, stateIcon: ">"}
        }));
        newTable.find((el) => el.id == elem).stateIcon = icon;
        return newTable;
    }

    function sortTable(toSort, order) {
        return function (a, b) {
            let x;
            let y;

            if (toSort === "id") {
                x = parseInt(a[toSort]);
                y = parseInt(b[toSort]); 
            } else {
                x = a[toSort].toLowerCase();
                y = b[toSort].toLowerCase();
            }
            if (x < y) {return order;}
            if (x > y) {return -order;}
            return 0;
        };
    }

    function sortElements(sortElement) {
        let arr = [...sortedList];
        let tmp = [...arr];
        arr.sort(sortTable(sortElement, 1));
        setTableHeadData(setHeadStateIcon(tableHeadData, "v", sortElement));
        if (JSON.stringify(arr) === JSON.stringify(tmp)) {
            arr.sort(sortTable(sortElement, -1));
            setTableHeadData(setHeadStateIcon(tableHeadData, "^", sortElement));
        }
        setSortedList(arr);
    }

    useEffect(() => {
    }, []);

    useEffect(() => {
        setSortedList(sessionList);
        setTableHeadData(sessionHead);
    }, [sessionList, sessionHead]);

    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    {tableHeadData.map((elem) => {
                        return (
                            <th 
                                key={elem.id}>
                                <label>
                                    {elem.name}
                                </label>
                                <button 
                                    className={styles.filterButton}
                                    onClick={() => {
                                        sortElements(elem.id)
                                    }}
                                >
                                    {elem.stateIcon}
                                </button>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {sortedList ? sortedList.map((elem) => {
                    return (
                        <tr 
                            onClick={() => {
                                navigate("/session/"+elem.id);
                            }}
                            className={styles.tableRow}
                            key={elem.id}>
                                {tableHeadData.map((t) => {
                                    return (<Td key={t.id} to={`/session/${elem.id}`}>{elem[t.id]}</Td>)
                                })}
                        </tr>
                    );
                }) : <></>}
            </tbody>
        </table>
    );
}

export default SessionsTable;