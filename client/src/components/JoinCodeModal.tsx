import React from 'react';
import { X, Copy, Check, Key } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface JoinCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    className: string;
    joinCode?: string;
}

export const JoinCodeModal: React.FC<JoinCodeModalProps> = ({ isOpen, onClose, className, joinCode }) => {
    const { addToast } = useToast();
    const [copied, setCopied] = React.useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (joinCode) {
            navigator.clipboard.writeText(joinCode);
            setCopied(true);
            addToast('Join code copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <Key className="w-5 h-5" />
                        <h3 className="font-bold text-lg">Class Join Code</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 text-center">
                    <p className="text-gray-500 mb-2 uppercase tracking-widest text-xs font-semibold">Class Name</p>
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">{className}</h2>

                    <div className="relative group">
                        <div className="bg-gray-50 border-2 border-dashed border-indigo-200 rounded-xl p-8 mb-6 relative hover:border-indigo-400 transition-colors">
                            <span className="text-6xl font-black text-indigo-600 tracking-[0.2em] font-mono leading-none select-all uppercase">
                                {joinCode || '------'}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-8">
                        Share this code with your students. They can use it to join this class automatically from their dashboard.
                    </p>

                    <button
                        onClick={handleCopy}
                        className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-indigo-200/50 ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:transform active:scale-95'
                            }`}
                    >
                        {copied ? (
                            <>
                                <Check className="w-6 h-6" />
                                Code Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Copy Join Code
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
