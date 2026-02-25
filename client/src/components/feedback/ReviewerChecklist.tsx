import React, { useState, useEffect } from 'react';

export const ReviewerChecklist = ({ onComplete }: { onComplete: (val: boolean) => void }) => {
    const [checks, setChecks] = useState({
        viewedFiles: false,
        readDescription: false,
        isKind: false,
        isSpecific: false
    });

    const handleCheck = (key: keyof typeof checks) => {
        const updated = { ...checks, [key]: !checks[key] };
        setChecks(updated);
    };

    useEffect(() => {
        onComplete(Object.values(checks).every(Boolean));
    }, [checks, onComplete]);

    return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 mt-6">
            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Quality Check</h4>
            <div className="space-y-2">
                {Object.entries(checks).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group select-none">
                        <input
                            type="checkbox"
                            checked={value}
                            onChange={() => handleCheck(key as any)}
                            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="text-sm text-amber-800 group-hover:text-amber-900">
                            {key === 'viewedFiles' && "I have opened and reviewed all attached files."}
                            {key === 'readDescription' && "I have read the full project/task description."}
                            {key === 'isKind' && "My 'Cool' feedback is helpful and kind (not mean)."}
                            {key === 'isSpecific' && "My 'Warm' feedback identifies a specific strength."}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
};
