import { WebEnv, wrapFile } from "@app/WebEnv";
import { Language } from "@pipeline/Languages";
import { ProgressStats, ProgressTask } from "@pipeline/Progress";
import { Config } from "@pipeline/Types";
import { generateDatabase, generateReport } from "@pipeline/index";

/** Message sent by the UI to start the generation process */
export interface InitMessage {
    files: File[];
    config: Config;
    origin: string;
}

/** Message sent by the worker to the UI periodically to update progress information */
export interface ProgressMessage {
    type: "progress";
    tasks: ProgressTask[];
    stats: ProgressStats;
}

/** Message sent by the worker with the report ready and stats */
export interface ResultMessage {
    type: "result";
    data?: string;
    html: string;
    title: string;
    lang: Language;
    counts: {
        messages: number;
        authors: number;
        channels: number;
        guilds: number;
    };
}

self.onmessage = async (ev: MessageEvent<InitMessage>) => {
    const { progress } = WebEnv;

    progress.on("progress", (tasks, stats) =>
        self.postMessage({
            type: "progress",
            tasks,
            stats,
        })
    );

    try {
        const database = await generateDatabase(ev.data.files.map(wrapFile), ev.data.config, WebEnv);
        if (env.isDev) console.log(database);
        const result = await generateReport(database, WebEnv);
        if (env.isDev) {
            // include the origin in relative URLs, so it can be opened locally
            // e.g. http://localhost:3000
            result.html = result.html
                .replace('<script defer src="', '<script defer src="' + ev.data.origin)
                .replace('<link href="', '<link href="' + ev.data.origin);
        }

        const message: ResultMessage = {
            type: "result",
            data: env.isDev ? result.data : "",
            html: result.html,
            title: database.title,
            lang: database.langs.length > 0 ? database.langs[0] : "",
            counts: {
                messages: database.numMessages,
                authors: database.authors.length,
                channels: database.channels.length,
                guilds: database.guilds.length,
            },
        };

        self.postMessage(message);
    } catch (ex) {
        // handle exceptions
        if (ex instanceof Error) {
            progress.error(ex.message);
        } else {
            progress.error(ex + "");
        }
        console.log("Error ahead ↓");
        console.error(ex);
    }
};

console.log("WorkerApp started");
