import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from "react";
import { AlertModal, type AlertLevel } from "@/components/AlertModal";

type ShowAlertArgs = {
	level: AlertLevel;
	message: string;
	onClose?: () => void;
};

type AlertState = {
	level: AlertLevel;
	message: string;
	onClose?: () => void;
};

type AlertContextType = {
	showAlert: (args: ShowAlertArgs) => void;
	dismissAlert: () => void;
};

const AlertContext = createContext<AlertContextType | null>(null);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
	const [alert, setAlert] = useState<AlertState | null>(null);

	const showAlert = useCallback(({ level, message, onClose }: ShowAlertArgs) => {
		setAlert({ level, message, onClose });
	}, []);

	const dismissAlert = useCallback(() => {
		setAlert((current) => {
			current?.onClose?.();
			return null;
		});
	}, []);

	return (
		<AlertContext.Provider value={{ showAlert, dismissAlert }}>
			{children}
			{alert && (
				<AlertModal
					level={alert.level}
					message={alert.message}
					onClose={dismissAlert}
				/>
			)}
		</AlertContext.Provider>
	);
};

export const useAlert = (): AlertContextType => {
	const context = useContext(AlertContext);
	if (!context) {
		throw new Error("useAlert must be used within an AlertProvider");
	}
	return context;
};
