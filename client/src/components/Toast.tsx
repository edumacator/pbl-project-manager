import React from 'react';
import { useToast, ToastType } from '../contexts/ToastContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
    switch (type) {
        case 'success':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error':
            return <AlertCircle className="w-5 h-5 text-red-500" />;
        case 'warning':
            return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        case 'info':
        default:
            return <Info className="w-5 h-5 text-blue-500" />;
    }
};

const ToastBackground: React.FC<{ type: ToastType; children: React.ReactNode }> = ({ type, children }) => {
    switch (type) {
        case 'success':
            return <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg shadow-lg flex items-start gap-3 w-80 mb-3 transition-all duration-300 pointer-events-auto mt-2">{children}</div>;
        case 'error':
            return <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg shadow-lg flex items-start gap-3 w-80 mb-3 transition-all duration-300 pointer-events-auto mt-2">{children}</div>;
        case 'warning':
            return <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg shadow-lg flex items-start gap-3 w-80 mb-3 transition-all duration-300 pointer-events-auto mt-2">{children}</div>;
        case 'info':
        default:
            return <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg shadow-lg flex items-start gap-3 w-80 mb-3 transition-all duration-300 pointer-events-auto mt-2">{children}</div>;
    }
};

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-none flex flex-col justify-end">
            {toasts.map(toast => (
                <ToastBackground key={toast.id} type={toast.type}>
                    <ToastIcon type={toast.type} />
                    <div className="flex-1 text-sm font-medium pt-0.5 right-6">{toast.message}</div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors pt-0.5"
                    >
                        <X className="w-4 h-4" />
                        <span className="sr-only">Dismiss</span>
                    </button>
                </ToastBackground>
            ))}
        </div>
    );
};
