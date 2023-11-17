import { createContext } from "react";
import { useEffect, useState, useContext } from "react";

export const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
    const [ toastList, setToastList ] = useState([]);

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
    // XXX: Probably bugged submit to further testing 
    useEffect(() => {
        if (toastList.length > 1) {
            toastList.shift();
            setToastList([...toastList]);
        }
    }, [toastList])

    return (
        <ToastContext.Provider value={{ toastList, setToastList, markToastAsDeleted }}>
            { children }
        </ToastContext.Provider>
    );
}

export {
    ToastProvider  
}