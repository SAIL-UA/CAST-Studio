import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertModal, type AlertLevel } from "@/components/AlertModal";

export type ShowAlertArgs = {
	level: AlertLevel;
	message: string;
	title?: string;
	onClose?: () => void;
	actionLabel?: string;
	onAction?: () => void | Promise<void>;
	cancelLabel?: string;
	destructive?: boolean;
};

type AlertState = ShowAlertArgs;

type AlertContextType = {
	showAlert: (args: ShowAlertArgs) => void;
	dismissAlert: () => void;
};

const AlertContext = createContext<AlertContextType | null>(null);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
	const [alert, setAlert] = useState<AlertState | null>(null);

	const showAlert = useCallback((args: ShowAlertArgs) => {
		setAlert(args);
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
					title={alert.title}
					onClose={dismissAlert}
					actionLabel={alert.actionLabel}
					onAction={alert.onAction}
					cancelLabel={alert.cancelLabel}
					destructive={alert.destructive}
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
