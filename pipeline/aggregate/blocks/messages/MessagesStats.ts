import { AttachmentType } from "@pipeline/Attachments";
import { Datetime } from "@pipeline/Time";
import { BitStream } from "@pipeline/serialization/BitStream";
import { BlockDescription, BlockFn } from "@pipeline/aggregate/Blocks";
import { WeekdayHourEntry } from "@pipeline/aggregate/Common";
import { filterMessages, normalizeTextForComparison } from "@pipeline/aggregate/Helpers";
import { MessageView } from "@pipeline/serialization/MessageView";
import { Index } from "@pipeline/Types";
import { getDatabase } from "@report/WorkerWrapper";

interface MostActiveEntry {
    messages: number;
    at?: Datetime;
}

export interface MessagesStats {
    /** Total number of messages sent */
    total: number;
    /** Total number of messages edited */
    edited: number;
    /** Number of active days given the time filter */
    numActiveDays: number;

    /** Number of messages that contain attachments of each type */
    withAttachmentsCount: { [type in AttachmentType]: number };
    /** Number of messages that contain text */
    withText: number;
    /** Number of messages that contain links */
    withLinks: number;

    counts: {
        /** Number of messages edited by each author */
        authors: number[];
        /** Number of messages edited in each channel */
        channels: number[];
    };

    weekdayHourActivity: WeekdayHourEntry[];

    mostActive: {
        hour: MostActiveEntry;
        day: MostActiveEntry;
        month: MostActiveEntry;
        year: MostActiveEntry;
    };
    copyMessagesFromSameCount: number;
    copyMessagesFromOtherCount: number;
}

const fn: BlockFn<MessagesStats> = (database, filters, common, args) => {
    const { dateKeys, weekKeys, monthKeys, yearKeys, dateToWeekIndex, dateToMonthIndex, dateToYearIndex } =
        common.timeKeys;

    let total = 0,
        edited = 0,
        withText = 0,
        withLinks = 0;
    const authorsCount = new Array(database.authors.length).fill(0);
    const channelsCount = new Array(database.channels.length).fill(0);
    const attachmentsCount = {
        [AttachmentType.Image]: 0,
        [AttachmentType.ImageAnimated]: 0,
        [AttachmentType.Video]: 0,
        [AttachmentType.Sticker]: 0,
        [AttachmentType.Audio]: 0,
        [AttachmentType.Document]: 0,
        [AttachmentType.Other]: 0,
    };

    let copyMessagesFromSameCount = 0;
    let copyMessagesFromOtherCount = 0;

    const hourlyCounts: number[] = new Array(24 * database.time.numDays).fill(0);
    const dailyCounts: number[] = new Array(database.time.numDays).fill(0);
    const monthlyCounts: number[] = new Array(database.time.numMonths).fill(0);
    const yearlyCounts: number[] = new Array(database.time.numYears).fill(0);
    const weekdayHourCounts: number[] = new Array(7 * 24).fill(0);

    const messagesByChannel = new Map<number, MessageView[]>();
    // Populate messagesByChannel
    filterMessages((msg: MessageView) => {
        if (!messagesByChannel.has(msg.channelIndex)) {
            messagesByChannel.set(msg.channelIndex, []);
        }
        messagesByChannel.get(msg.channelIndex)!.push(msg);
    }, database, filters, common, { channels: true, authors: false, time: true });
    
    const calculateSimilarityPercentage = (text1: string, text2: string): number => {
        // Exclude specific messages from similarity calculation
        const excludedMessages = ["you deleted this message", "this message was deleted"];
        if (excludedMessages.includes(text1) || excludedMessages.includes(text2)) {
            return 0; // Return 0 similarity for excluded messages
        }

        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);

        const set1 = new Set(words1);
        const set2 = new Set(words2);

        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const similarity = (intersection.size / Math.max(set1.size, set2.size)) * 100;

        return similarity;
    };
    
    const copiedMessages: {
        currentMessage: { id: number; text: string; date: { key: string; secondOfDay: number }; authorIndex: number };
        similarMessages: { id: number; text: string; date: { key: string; secondOfDay: number }; authorIndex: number }[];
    }[] = [];

    const processMessage = (msg: MessageView) => {
        // Skip messages with specific text
        if (
            msg.text === "You deleted this message." ||
            msg.text === "This message was deleted."
        ) {
            return; // Skip processing this message
        }

        total++;
        if (msg.hasEdits) edited++;
        if (msg.hasDomains) withLinks++;
        if (msg.langIndex !== undefined) withText++;


        authorsCount[msg.authorIndex]++;
        channelsCount[msg.channelIndex]++;
        hourlyCounts[msg.dayIndex * 24 + Math.floor(msg.secondOfDay / 3600)]++;
        dailyCounts[msg.dayIndex]++;
        monthlyCounts[dateToMonthIndex[msg.dayIndex]]++;
        yearlyCounts[dateToYearIndex[msg.dayIndex]]++;

        const dayOfWeek = common.dayOfWeek[msg.dayIndex];
        weekdayHourCounts[dayOfWeek * 24 + Math.floor(msg.secondOfDay / 3600)]++;

        const attachments = msg.attachments;
        if (attachments) {
            for (const attachment of attachments) {
                attachmentsCount[attachment[0]] += attachment[1];
            }
        }

        // Detect copied content
        const currentText = msg.text ? normalizeTextForComparison(msg.text) : "";
        if (
            currentText &&
            currentText !== "" &&
            currentText !== "you deleted this message" && // Ensure normalized text is excluded
            currentText !== "this message was deleted"
        ) {

            const channelMessages = messagesByChannel.get(msg.channelIndex) || [];

            // Create a Set for faster lookups
            const sameMemberTexts = new Set<string>();
            const otherMemberTexts = new Set<string>();
            const similarMessages: { id: number; text: string; date: { key: string; secondOfDay: number }; authorIndex: number }[] = [];

            for (const prevMsg of channelMessages) {
                if (prevMsg.dayIndex > msg.dayIndex || prevMsg.id === msg.id) {
                    continue; // Skip future messages and the current message itself
                }

                const prevText = prevMsg.text ? normalizeTextForComparison(prevMsg.text) : null;
                if (!prevText) continue;

                const similarity = calculateSimilarityPercentage(currentText, prevText);

                if (similarity > 50 && prevMsg.secondOfDay < msg.secondOfDay) {
                    similarMessages.push({
                        id: prevMsg.id,
                        text: prevMsg.text || "",
                        date: { key: dateKeys[prevMsg.dayIndex], secondOfDay: prevMsg.secondOfDay },
                        authorIndex: prevMsg.authorIndex,
                    });

                    if (prevMsg.authorIndex === msg.authorIndex) {
                        sameMemberTexts.add(prevText);
                    } else {
                        otherMemberTexts.add(prevText);
                    }
                }
            }

            sameMemberTexts.forEach(text => {
                const similarity = calculateSimilarityPercentage(text, currentText);
                if(similarity > 50)
                    copyMessagesFromSameCount++;
            })
            otherMemberTexts.forEach(text => {
                const similarity = calculateSimilarityPercentage(text, currentText);
                if(similarity > 50)
                    copyMessagesFromOtherCount++;
            })

            // If there are similar messages, add the current message and its similar messages to the list
            if (similarMessages.length > 0) {
                copiedMessages.push({
                    currentMessage: {
                        id: msg.id,
                        text: msg.text || "",
                        date: { key: dateKeys[msg.dayIndex], secondOfDay: msg.secondOfDay },
                        authorIndex: msg.authorIndex,
                    },
                    similarMessages,
                });
            }
        }
    };

    filterMessages(processMessage, database, filters, common);

    // After processing all messages, sort the copiedMessages list
    copiedMessages.sort((a, b) => a.currentMessage.authorIndex - b.currentMessage.authorIndex);

    // Log or return the copiedMessages list
    // database.copiedMessages = copiedMessages || [];
    // Emit an event to notify that copiedMessages is ready
    if (typeof self !== "undefined" && self.postMessage) {
        self.postMessage({ type: "update-copied-messages", copiedMessages, dateKeys });
    }

    const weekdayHourActivity: WeekdayHourEntry[] = weekdayHourCounts.map((count, i) => {
        const weekday = Math.floor(i / 24);
        const hour = i % 24;
        return {
            value: count,
            hour: `${hour}hs`,
            weekday: (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[weekday],
        };
    });

    const findMostActive = (counts: number[], buildDatetimeFn: (index: number) => Datetime): MostActiveEntry => {
        let max = 0,
            maxIndex = -1;
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] > max) {
                max = counts[i];
                maxIndex = i;
            }
        }
        return { messages: max, at: maxIndex === -1 ? undefined : buildDatetimeFn(maxIndex) };
    };

    return {
        total,
        edited,
        numActiveDays: filters.numActiveDays,

        withAttachmentsCount: attachmentsCount,
        withText,
        withLinks,

        counts: {
            authors: authorsCount,
            channels: channelsCount,
        },

        weekdayHourActivity,

        // prettier-ignore
        mostActive: {
            hour: findMostActive(hourlyCounts, i => ({ key: dateKeys[Math.floor(i / 24)], secondOfDay: (i % 24) * 3600 })),
            day: findMostActive(dailyCounts, i => ({ key: dateKeys[i] })),
            month: findMostActive(monthlyCounts, i => ({ key: monthKeys[i] })),
            year: findMostActive(yearlyCounts, i => ({ key: yearKeys[i] })),
        },
        copyMessagesFromSameCount,
        copyMessagesFromOtherCount,
    };
};

export default {
    key: "messages/stats",
    triggers: ["authors", "channels", "time"],
    fn,
} as BlockDescription<"messages/stats", MessagesStats>;
