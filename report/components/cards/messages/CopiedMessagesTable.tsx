import React from "react";
import { useEffect, useState, useRef } from "react";
import { VariableSizeList as List } from "react-window";
import { getDatabase, getWorker } from "@report/WorkerWrapper";
import "@assets/styles/CopiedMessagesTable.less";
import { CopiedMessage } from "@report/AppContext";


const CopiedMessagesTable = () => {
    const [copiedMessages, setCopiedMessages] = useState<CopiedMessage[]>([]);

    const getAuthorName = (authorIndex: number): string => {
        const author = getDatabase().authors.find((a, index) => index === authorIndex);
        return author ? author.n : "Unknown";
    };

    useEffect(() => {
        const worker = getWorker();
        const handleCopiedMessagesUpdated = (updatedCopiedMessages: CopiedMessage[]) => {
            setCopiedMessages(updatedCopiedMessages);
        };

        worker.on("copied-messages-updated", handleCopiedMessagesUpdated);

        // Cleanup listener on unmount
        return () => {
            worker.off("copied-messages-updated", handleCopiedMessagesUpdated);
        };
    }, []);

    // Ref for VariableSizeList to reset cached row sizes
    const listRef = useRef<List>(null);

    // Function to calculate the height of each row
    const getRowHeight = (index: number): number => {
        const copied = copiedMessages[index];
        const baseHeight = 50; // Base height for a row
        const similarMessagesHeight = copied.similarMessages.length > 12 
            ? copied.similarMessages.length * 25 
            : copied.similarMessages.length * 20; // 20px per similar message, 25px if more than 12
        return baseHeight + similarMessagesHeight;
    };

    // Row renderer for react-window
    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const copied = copiedMessages[index];
        return (
            <div
                style={{
                    ...style,
                    display: "grid",
                    gridTemplateColumns: "7% 8% 20% 15% 50%", // Match the header's grid-template-columns
                }}
                className="table-row"
            >
                <div className="table-cell">{copied.currentMessage.id}</div>
                <div className="table-cell">{getAuthorName(copied.currentMessage.authorIndex)}</div>
                <div className="table-cell" title={copied.currentMessage.text}>
                    {copied.currentMessage.text.length > 40
                        ? copied.currentMessage.text.substring(0, 40) + "..."
                        : copied.currentMessage.text}
                </div>
                <div className="table-cell">
                    {copied.currentMessage.date.key} -{" "}
                    {new Date(copied.currentMessage.date.secondOfDay * 1000)
                        .toISOString()
                        .substr(11, 8)}
                </div>
                <div className="table-cell">
                    <ul>
                        {copied.similarMessages.map((similar, i) => (
                            <li key={i} title={similar.text}>
                                <b>Author:</b> {getAuthorName(similar.authorIndex)}, <b>Message:</b>{" "}
                                {similar.text.length > 40
                                    ? similar.text.substring(0, 40) + "..."
                                    : similar.text},{" "}
                                <b>Date:</b> {similar.date.key} -{" "}
                                {new Date(similar.date.secondOfDay * 1000)
                                    .toISOString()
                                    .substr(11, 8)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div className="CopiedMessagesTable">
            <div className="table-container">
                <div className="table-header">
                    <div className="table-cell">Message ID</div>
                    <div className="table-cell">Author</div>
                    <div className="table-cell">Message</div>
                    <div className="table-cell">Date</div>
                    <div className="table-cell">Similar Messages</div>
                </div>
                <div className="table-content" style={{ overflowX: "auto" }}>
                    <div style={{ width: "100%" }}>
                        <List
                            ref={listRef}
                            height={350} // Height of the scrollable area
                            itemCount={copiedMessages.length} // Total number of rows
                            itemSize={getRowHeight} // Function to calculate the height of each row
                            width={'100%'} // Set the total width of all columns
                        >   
                            {Row}
                        </List>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopiedMessagesTable;