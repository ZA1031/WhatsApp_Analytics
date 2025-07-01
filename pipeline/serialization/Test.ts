import { BitStream } from "./BitStream";
import { writeMessage } from "./MessageSerialization";
import { MessageBitConfig, DefaultMessageBitConfig } from "./MessageSerialization";
import { MessageView } from "./MessageView";
import { Message } from "../process/Types";

const stream = new BitStream();
const message: Message = {
    id: 123,
    dayIndex: 456,
    secondOfDay: 789,
    authorIndex: 1
};

writeMessage(message, stream, DefaultMessageBitConfig);

const dateKeys = ["2023-10-01", "2023-10-02"]; // Example date keys
const deserializedMessage = new MessageView(stream, DefaultMessageBitConfig, dateKeys);
console.log("Message ID:", deserializedMessage.id); // Should print 123