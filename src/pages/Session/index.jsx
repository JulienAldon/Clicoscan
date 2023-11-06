import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AppButton from "../../components/AppButton";

function Session() {
    const { id } = useParams();
    
    return (
        <main>
            <h1>Session #{id}</h1>
        </main>
    );
}
export default Session;