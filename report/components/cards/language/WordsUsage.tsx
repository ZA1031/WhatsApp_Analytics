import { useContext, useEffect, useState } from "react";

import { useBlockData } from "@report/BlockHook";
import { getDatabase, getFormatCache, getWorker } from "@report/WorkerWrapper";
import { LoadingGroup } from "@report/components/LoadingGroup";
import WordCloud from "@report/components/cards/language/WordCloud";
import WordStats from "@report/components/cards/language/WordStats";
import { WordLabel } from "@report/components/core/labels/WordLabel";
import { SelectedBarEntry } from "@report/components/viz/AnimatedBars";
import MostUsed from "@report/components/viz/MostUsed";
import { normalizeTextForComparison } from "@pipeline/aggregate/Helpers";
import "@assets/styles/WordsCard.less";
import { useAppContext } from "@report/AppContext";

const WordsIndexOf = (value: string) => getFormatCache().words.indexOf(value);
const WordsInFilter = (index: number, filter: string | RegExp) => {
    const word = getFormatCache().words[index];
    return filter instanceof RegExp ? filter.test(word) : word.startsWith(filter);
};

const WordsUsage = ({ options }: { options: number[] }) => {
    const worker = getWorker();
    const languageStats = useBlockData("language/stats");
    const { setContainingMessages, messagesAll, setMessagesAll } = useAppContext(); // Access setMessagesAll from context
    const [selectedWord, setSelectedWord] = useState<SelectedBarEntry>({
        index: -1,
        manual: false,
    });

    // Effect to listen for messages from the worker
    useEffect(() => {
        const handleWorkerMessage = (messagesAll: any[]) => {
            // Update messagesAll with the received data
            setMessagesAll(messagesAll);
        };

        // Add the event listener
        worker.on("messages-all", handleWorkerMessage);

        // Cleanup the event listener on unmount
        return () => {
            worker.off("messages-all", handleWorkerMessage);
        };
    }, []);

    // Effect to handle selected word changes
    useEffect(() => {
        if (selectedWord.index !== -1) {
            // Get the selected word text
            const selectedWordText = getDatabase().words[selectedWord.index];

            // Find all messages containing the selected word
            if (messagesAll == null) return;
            console.log("All Messages+>", messagesAll);
            const messagesContainingWord = messagesAll
                .filter((msg) => {
                        // msg.text?.includes(selectedWordText)
                        const text = msg.text;
                        if (text == null) return false;
                        const wordsList = text.split(/[ .,;:\\n]/);
                        const normalizedWordsList = wordsList.map((word) => normalizeTextForComparison(word));
                        return normalizedWordsList.includes(normalizeTextForComparison(selectedWordText));
                    }
                )
                .map((msg) => ({
                    id: msg.id,
                    text: msg.text ? msg.text : "",
                    date: { key: msg.date, secondOfDay: msg.secondOfDay },
                    authorIndex: msg.authorIndex,
                }));

            // Update containingMessages with the selected word and its messages
            if (messagesContainingWord.length > 0) {
                setContainingMessages([
                    {
                        word: selectedWordText,
                        containingMessages: messagesContainingWord,
                    },
                ]);
            } else {
                setContainingMessages([]);
            }
        }
    }, [selectedWord, messagesAll]);

    if (options[0] === 1) return <WordCloud wordsCount={languageStats?.wordsCount} />;

    return (
        <div className="WordsCard">
            <MostUsed
                what="Word"
                unit="Times used"
                counts={languageStats?.wordsCount}
                maxItems={Math.min(15, getDatabase().words.length)}
                itemComponent={WordLabel}
                searchable
                allowRegex
                searchPlaceholder="Filter words..."
                indexOf={WordsIndexOf}
                inFilter={WordsInFilter}
                selectable={true}
                selected={selectedWord}
                onSelectChange={setSelectedWord}
            />

            <LoadingGroup>
                {(state) => (
                    <div className={"WordsCard__group " + (state !== "ready" ? "WordsCard__loading" : "")}>
                        <WordStats wordIndex={selectedWord.index} />
                        <div className="WordsCard__overlay" />
                    </div>
                )}
            </LoadingGroup>
        </div>
    );
};

export default WordsUsage;
