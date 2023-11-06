const AppButton = ({ButtonText, ButtonAction}) => {
    return (
        <button onClick={() => {
            ButtonAction()
        }}>{ButtonText}</button>
    );
}

export default AppButton;