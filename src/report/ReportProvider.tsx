import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { ReportDraft } from "../types/report";

interface ReportContextValue {
    reportDraft: ReportDraft | null;
    setReportDraft: (
        draft: ReportDraft | null | ((current: ReportDraft | null) => ReportDraft | null),
    ) => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
    const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
    const value = useMemo(
        () => ({ reportDraft, setReportDraft }),
        [reportDraft],
    );

    return (
        <ReportContext.Provider value={value}>
            {children}
        </ReportContext.Provider>
    );
}

// oxlint-disable-next-line react/only-export-components
export function useReportContext() {
    const context = useContext(ReportContext);

    if (!context) {
        throw new Error("useReportContext must be used inside ReportProvider");
    }

    return context;
}
