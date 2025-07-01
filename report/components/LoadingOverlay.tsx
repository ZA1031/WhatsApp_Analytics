import Spinner from "@assets/images/icons/spinner.svg";
import Logo from "@assets/images/logos/new_logo.png";

interface Props {
    loading: boolean;
}

const LoadingOverlay = (props: Props) => (
    <div className={`LoadingOverlay ${props.loading ? "" : "LoadingOverlay--hidden"}`}>
        <div className="LoadingOverlay__logo">
            <img src={Logo} alt="chatanalytics.app logo" style={{width: '300px', height: '180px'}} />
        </div>
        <div className="LoadingOverlay__spinner">
            <img src={Spinner} alt="spinner" />
            <div>Decompressing data...</div>
        </div>
    </div>
);

export default LoadingOverlay;
