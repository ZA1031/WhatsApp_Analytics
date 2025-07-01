import React, { createContext, useContext, useState } from "react";
import { MessageView } from "@pipeline/serialization/MessageView";

export interface CopiedMessage {
    currentMessage: {
        id: number;
        text: string;
        date: { key: string; secondOfDay: number };
        authorIndex: number;
    };
    similarMessages: {
        id: number;
        text: string;
        date: { key: string; secondOfDay: number };
        authorIndex: number;
    }[];
}
export interface ContainingMessage {
    word: string;
    containingMessages: {
        id: number;
        text: string;
        date: { key: string; secondOfDay: number };
        authorIndex: number;
    }[];
}
// Define a generic AppContextType interface
interface AppContextType {
    matchingItem: any | null;
    setMatchingItem: (item: any | null) => void;
    messagesAll: MessageView[] | null; // Assuming MessageView is defined elsewhere
    setMessagesAll: (messages: MessageView[] | null) => void; // Update the setter type
    containingMessages: ContainingMessage[] | null;
    setContainingMessages: (containingMessages: ContainingMessage[] | null) => void; // Update the setter type

    dateKeys: string[]; // Example: Add more extensible state properties here
    setDateKeys: (dateKeys: string[]) => void; // Example: Add more extensible state properties here
    // Example: Add more extensible state properties here
    [key: string]: any; // Allow additional properties dynamically
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [messagesAll, setMessagesAll] = useState<MessageView[] | null>(null); // Update the state type
    const [matchingItem, setMatchingItem] = useState<any | null>(null);
    const [containingMessages, setContainingMessages] = useState<ContainingMessage[] | null>(null); // Update the state type
    const [dateKeys, setDateKeys] = useState<string[]>([]); // Example: Add more extensible state properties here
    return (
        <AppContext.Provider
            value={{
                messagesAll,
                setMessagesAll,
                matchingItem,
                setMatchingItem,
                containingMessages,
                setContainingMessages,
                dateKeys,
                setDateKeys
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

// Hook to use the context
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
};