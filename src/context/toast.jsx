import { createContext } from "react";
import { useEffect, useState, useContext } from "react";

export const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
    const [ toastList, setToastList ] = useState([]);

    // XXX: Probably bugged submit to further testing 
    useEffect(() => {
        if (toastList.length > 2) {
            toastList.shift();
            setToastList([...toastList]);
        }
    }, [toastList])

    return (
        <ToastContext.Provider value={{ toastList, setToastList }}>
            { children }
        </ToastContext.Provider>
    );
}

export {
    ToastProvider  
}