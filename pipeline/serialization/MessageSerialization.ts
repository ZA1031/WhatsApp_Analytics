import { Message } from "@pipeline/process/Types";
import { BitStream } from "@pipeline/serialization/BitStream";
import { readIndexCounts, writeIndexCounts } from "@pipeline/serialization/IndexCountsSerialization";
import { text } from "stream/consumers";

/** These flags are used to encode the presence of optional fields in a Message */
// prettier-ignore
export enum MessageFlags {
    None,
    Reply       = 1 << 0,
    Edited      = 1 << 1,
    Text        = 1 << 2,
    Words       = 1 << 3,
    Emojis      = 1 << 4,
    Attachments = 1 << 5,
    Reactions   = 1 << 6,
    Mentions    = 1 << 7,
    Domains     = 1 << 8,
}

/** Defines how many bits are used for various fields in a Message */
export interface MessageBitConfig {
    dayBits: number;
    authorIdxBits: number;
    wordIdxBits: number;
    emojiIdxBits: number;
    mentionsIdxBits: number;
    domainsIdxBits: number;
}

/**
 * Default bit configuration for messages.
 * At the start we don't know how many authors, words, emojis, etc. we have, so we have to use a conservative
 * configuration that works for all possible values.
 *
 * These values are hand-picked.
 */
export const DefaultMessageBitConfig: MessageBitConfig = {
    dayBits: 21, // 12 + 4 + 5
    authorIdxBits: 21,
    wordIdxBits: 21,
    emojiIdxBits: 18,
    mentionsIdxBits: 20,
    domainsIdxBits: 16,
};

/** Writes the message into the stream using the provided bit configuration */
export const writeMessage = (message: Message, stream: BitStream, bitConfig: MessageBitConfig) => {
    // Serialize id
    if (message.id !== undefined) {
        stream.writeVarInt(message.id);
    } else {
        throw new Error("Message ID is undefined");
    }

    stream.setBits(bitConfig.dayBits, message.dayIndex);
    stream.setBits(17, message.secondOfDay); // 0-2^17 (needed 86400)
    stream.setBits(bitConfig.authorIdxBits, message.authorIndex);

    let flags = MessageFlags.None;
    if (message.replyOffset !== undefined) flags |= MessageFlags.Reply;
    if (message.editedAfter !== undefined) flags |= MessageFlags.Edited;
    if (message.langIndex !== undefined) flags |= MessageFlags.Text;
    if (message.words?.length) flags |= MessageFlags.Words;
    if (message.emojis?.length) flags |= MessageFlags.Emojis;
    if (message.attachments?.length) flags |= MessageFlags.Attachments;
    if (message.reactions?.length) flags |= MessageFlags.Reactions;
    if (message.mentions?.length) flags |= MessageFlags.Mentions;
    if (message.domains?.length) flags |= MessageFlags.Domains;
    stream.setBits(9, flags);

    if (flags & MessageFlags.Reply) stream.writeVarInt(message.replyOffset!, 48);
    if (flags & MessageFlags.Edited) stream.writeVarInt(message.editedAfter!);
    if (flags & MessageFlags.Text) {
        stream.setBits(8, message.langIndex!); // 0-255
        stream.setBits(8, Math.max(-128, Math.min(127, message.sentiment!)) + 128); // 0-255

        // Serialize the text content
        if (message.text) {
            const textBytes = new TextEncoder().encode(message.text); // Convert text to bytes
            stream.writeVarInt(textBytes.length); // Write the length of the text
            for (const byte of textBytes) {
                stream.setBits(8, byte); // Write each byte as 8 bits
            }
        } else {
            stream.writeVarInt(0); // No text
        }
    }
    if (flags & MessageFlags.Words) writeIndexCounts(message.words!, stream, bitConfig.wordIdxBits);
    if (flags & MessageFlags.Emojis) writeIndexCounts(message.emojis!, stream, bitConfig.emojiIdxBits);
    if (flags & MessageFlags.Attachments) writeIndexCounts(message.attachments!, stream, 3);
    if (flags & MessageFlags.Reactions) writeIndexCounts(message.reactions!, stream, bitConfig.emojiIdxBits);
    if (flags & MessageFlags.Mentions) writeIndexCounts(message.mentions!, stream, bitConfig.mentionsIdxBits);
    if (flags & MessageFlags.Domains) writeIndexCounts(message.domains!, stream, bitConfig.domainsIdxBits);
};

/**
 * Reads a whole message from the stream using the provided bit configuration.
 * If you don't need all the fields, you may want to use the `MessageView` class instead.
 */
export const readMessage = (stream: BitStream, bitConfig: MessageBitConfig): Message => {
    const id = stream.readVarInt()
    const day = stream.getBits(bitConfig.dayBits);
    const secondOfDay = stream.getBits(17);
    const authorIndex = stream.getBits(bitConfig.authorIdxBits);
    const flags = stream.getBits(9);

    const message: Message = {
        id: id,
        dayIndex: day,
        secondOfDay,
        authorIndex,
    };

    if (flags & MessageFlags.Reply) message.replyOffset = stream.readVarInt();
    if (flags & MessageFlags.Edited) message.editedAfter = stream.readVarInt();
    if (flags & MessageFlags.Text) {
        message.langIndex = stream.getBits(8);
        message.sentiment = stream.getBits(8) - 128;
        // Deserialize the text content
        const textLength = stream.readVarInt(); // Read the length of the text
        if (textLength > 0) {
            const textBytes = new Uint8Array(textLength);
            for (let i = 0; i < textLength; i++) {
                textBytes[i] = stream.getBits(8); // Read each byte as 8 bits
            }
            message.text = new TextDecoder().decode(textBytes); // Convert bytes to string
        } else {
            message.text = ""; // No text
        }
    }
    if (flags & MessageFlags.Words) message.words = readIndexCounts(stream, bitConfig.wordIdxBits);
    if (flags & MessageFlags.Emojis) message.emojis = readIndexCounts(stream, bitConfig.emojiIdxBits);
    if (flags & MessageFlags.Attachments) message.attachments = readIndexCounts(stream, 3);
    if (flags & MessageFlags.Reactions) message.reactions = readIndexCounts(stream, bitConfig.emojiIdxBits);
    if (flags & MessageFlags.Mentions) message.mentions = readIndexCounts(stream, bitConfig.mentionsIdxBits);
    if (flags & MessageFlags.Domains) message.domains = readIndexCounts(stream, bitConfig.domainsIdxBits);

    return message;
};
