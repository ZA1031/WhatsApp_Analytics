import React, { useEffect } from "react";
import { getDatabase, getWorker } from "@report/WorkerWrapper";
import "@assets/styles/ContainingMessagesTable.less";

import { useAppContext, ContainingMessage } from "@report/AppContext";

const ContainingMessagesTable = () => {
    const { containingMessages, setContainingMessages } = useAppContext(); // Access the context

    const getAuthorName = (authorIndex: number): string => {
        const author = getDatabase().authors.find((a, index) => index === authorIndex);
        return author ? author.n : "Unknown";
    };

    useEffect(() => {
        console.log("containingMessages=>", containingMessages);
        // const worker = getWorker();
        // const handleContainingMessagesUpdated = (updatedContainingMessages: ContainingMessage[]) => {
        //     setContainingMessages(updatedContainingMessages);
        // };

        // worker.on("containing-messages-updated", handleContainingMessagesUpdated);

        // // Cleanup listener on unmount
        // return () => {
        //     worker.off("containing-messages-updated", handleContainingMessagesUpdated);
        // };
    }, [containingMessages]);

    if (!containingMessages || containingMessages.length === 0) {
        return <p>No containing messages available.</p>; // Handle empty or null case
    }
    return (
        <div className="table-wrapper">
            <table className="ContainingMessagesTable">
                <thead>
                    <tr>
                        <th style={{ width: "30%", textAlign: "center" }}>Word</th>
                        <th style={{ width: "70%", textAlign: "center" }}>Containing Messages</th>
                    </tr>
                </thead>
                <tbody>
                    {containingMessages.map((containing, index) => (
                        <tr key={index}>
                            <td style={{ width: "30%", textAlign: "center", verticalAlign: "top" }}>
                                <b>{containing.word}</b>
                            </td>
                            <td style={{ width: "70%", wordWrap: "break-word" }}>
                                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                                    {containing.containingMessages.map((message, i) => (
                                        <li key={i} title={message.text} style={{ marginBottom: "10px" }}>
                                            <b>{i + 1}.</b> {message.text}
                                            <br />
                                            <b>Author:</b> {getAuthorName(message.authorIndex)}
                                            <br />
                                            <b>Date:</b> {message.date.key}-{" "}
                                            {new Date(message.date.secondOfDay * 1000)
                                                .toISOString()
                                                .substr(11, 8)}
                                        </li>
                                    ))}
                                </ul>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ContainingMessagesTable;