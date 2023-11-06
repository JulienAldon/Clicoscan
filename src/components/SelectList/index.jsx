import styles from './style.module.css';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

const SelectList = ({data, onChange, className, clearFilter}) => {
    const [ choices, setChoices ] = useState([]);

    useEffect(() => {
        setChoices(data.map((el)=> {
            return {value: el.name, label: el.name}
        }));
    }, [data])

    return (
        <Select 
            className={`${className}`}
            options={choices}
            onChange={onChange}
            isClearable={true}
            isSearchable={true}
            placeholder="City"
        />
    );
}

export default SelectList;