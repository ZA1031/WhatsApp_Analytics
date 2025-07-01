import { getDatabase } from "@report/WorkerWrapper";
import { Tooltip } from "@report/components/core/Tooltip";

import GitHub from "@assets/images/logos/github.svg";
import "@assets/styles/Footer.less";

const extraInfo = () => (
    <>
        Report generated at: <b>{getDatabase().generatedAt}</b>
        <br />
        Build date: <b>{env.build.date}</b>
        <br />
        Build version: <b>v{env.build.version}</b>
    </>
);

export default () => (
    <div className="Footer">
        <div>
            <span>Developed By</span>
                Mr. Martín Lombardomlomb.
        </div>
        <div>
            <span>Customized By</span>
            <a href="mailto:nasser@nasser.ae" target="_blank">
                Mr. Nasser Alzaabi.
            </a>
        </div>
        {/* <span>•</span>
        <span>
            <a href="https://github.com/mlomb/chat-analytics" target="_blank">
                <img src={GitHub} alt="GitHub" />
            </a>
            <Tooltip content={extraInfo()}>
                <span className="Footer__build">build {env.build.commitHash}</span>
            </Tooltip>
        </span> */}
    </div>
);
