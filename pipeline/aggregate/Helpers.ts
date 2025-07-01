import { Filters } from "@pipeline/aggregate/Filters";
import { Database } from "@pipeline/process/Types";
import { BitStream } from "@pipeline/serialization/BitStream";
import { MessageView } from "@pipeline/serialization/MessageView";

/**
 * Filter messages in a database with the specified filters.
 * Calls the given function for each message that passes the filters.
 *
 * @param fn function to call for each message
 * @param activeFilters select which filters to apply
 */
export const filterMessages = (
    fn: (msg: MessageView) => void,
    database: Database,
    filters: Filters,
    common: { timeKeys: { dateKeys: string[] } }, // Add common as an argument
    activeFilters = { channels: true, authors: true, time: true }
) => {
    const stream = new BitStream(database.messages!.buffer);
    for (let channelIndex = 0; channelIndex < database.channels.length; channelIndex++) {
        // filter channel
        if (activeFilters.channels && !filters.hasChannel(channelIndex)) continue;
        const channel = database.channels[channelIndex];

        if (channel.msgAddr === undefined) continue;
        if (channel.msgCount === undefined) continue;

        // seek
        stream.offset = channel.msgAddr;

        // read messages
        for (let read = 0; read < channel.msgCount; read++) {
            const message = new MessageView(stream, database.bitConfig, common.timeKeys.dateKeys); // Pass dateKeys to MessageView
            // filter time
            if (!activeFilters.time || filters.inTime(message.dayIndex)) {
                // filter author
                if (!activeFilters.authors || filters.hasAuthor(message.authorIndex)) {
                    // make sure to preserve the offset, since reading properties inside `fn` changes the offset
                    const prevOffset = stream.offset;
                    message.guildIndex = channel.guildIndex;
                    message.channelIndex = channelIndex;
                    fn(message);
                    stream.offset = prevOffset;
                }
            }
        }
    }
};

export const normalizeTextForComparison = (text: string): string => {
    return text
        .normalize("NFC") // Normalize Unicode to NFC form
        .trim()
        // .toLowerCase()
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/[^\w\s\u0600-\u06FF]/g, "") // Remove non-alphanumeric and non-Arabic characters
        .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g, "") // Remove Arabic diacritics
        .replace(/ﻻ/g, "لا") // Normalize Arabic ligatures
        .replace(/،/g, ",") // Normalize Arabic punctuation
        .replace(/؛/g, ";")
        .replace(/؟/g, "?"); // Normalize Arabic question mark
};
