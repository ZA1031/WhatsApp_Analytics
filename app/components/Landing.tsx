import { Button } from "@app/components/Button";
import { Platform, PlatformsInfo } from "@pipeline/Platforms";

import { PlatformLogos } from "@assets/PlatformLogos";
import Lock from "@assets/images/icons/lock.svg";
import GitHub from "@assets/images/logos/github.svg";
import "@assets/styles/Landing.less";

interface Props {
    onStart: () => void;
}

export const Landing = ({ onStart }: Props) => {
    return (
        <div className="Landing" style={{ textAlign: "center" }}>
            {/* <h1 className="Landing__title">Generate interactive, beautiful and insightful chat analysis reports</h1> */}
            <div className="Landing__desc" style={{ textAlign: "justify" }}>
                <div className="Landing__sameline">
                    <p>
                        1. This web application was developed by Mr. Martin Lombardumlumb, a software engineer and a full stack developer, and was customized for this local version by Mr. Nasser Alzaabi with assistance.
                    </p>
                </div>
                <div className="Landing__sameline">
                    <p>
                        2. This web application is subject to Open-Source Software License No. AGPLv3.
                    </p>
                </div>
                <div className="Landing__sameline">
                    <p>
                        3. This version of the application is prohibited for use on any type of network, whether local or global, and should only be used on a local computer using (localhost). For any inquiries regarding this matter, please contact Mr. Nasser Alzaabi.
                    </p>
                </div>
                <div className="Landing__sameline">
                    <p>
                        4. This version of the application is specifically licensed for use by employees of “ibhath” Company and the current client employing Mr. Nasser Alzaabi, subject to the above conditions.
                    </p>
                </div>
                <div className="Landing__sameline">
                    <p>
                        5. Any violation of the terms of use of this version may conflict with the open-source software modification agreement, and the violator shall bear all legal consequences, and Mr. Nasser Al Zaabi shall not bear any responsibility resulting from violating the terms of use.
                    </p>
                </div>
            </div>
            <span className="Landing__last">
                    This version is valid from 15/05/2025.
            </span>
            <div className="Landing__buttons">
                <Button hueColor={[258, 90, 61]} className="Landing__cta" onClick={onStart}>
                    Accept and Continue
                </Button>
                {/* <Button
                    hueColor={[244, 90, 61]}
                    href={env.isSelfHosted ? "https://chatanalytics.app/demo" : env.isDev ? "/report.html" : "/demo"}
                    target="_blank"
                >
                    View Demo
                </Button>
                <Button hueColor={[207, 23, 8]} href="https://github.com/mlomb/chat-analytics" target="_blank">
                    <img src={GitHub} alt="" />
                    GitHub
                </Button> */}
            </div>
        </div>
    );
};
