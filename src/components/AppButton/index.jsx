const AppButton = ({className, ButtonAction, children, disabled}) => {
    return (
        <button
            disabled={disabled}
            className={className} 
            onClick={() => {
            ButtonAction()
        }}>{children}</button>
    );
}

export default AppButton;