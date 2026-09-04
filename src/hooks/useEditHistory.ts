import {
    useState,
} from "react";

import type {
    EditTransaction,
} from "../types/editHistory";

const DEFAULT_HISTORY_LIMIT = 30;

export function useEditHistory(
    historyLimit = DEFAULT_HISTORY_LIMIT,
) {
    const [undoStack, setUndoStack] =
        useState<EditTransaction[]>([]);
    const [redoStack, setRedoStack] =
        useState<EditTransaction[]>([]);

    function pushTransaction(transaction: EditTransaction) {
        setUndoStack((previous) => [
            ...previous.slice(-(historyLimit - 1)),
            transaction,
        ]);
        setRedoStack([]);
    }

    function undo() {
        const transaction = undoStack.at(-1) ?? null;

        if (!transaction) {
            return null;
        }

        setUndoStack((previous) => previous.slice(0, -1));
        setRedoStack((previous) => [...previous, transaction]);
        return transaction;
    }

    function redo() {
        const transaction = redoStack.at(-1) ?? null;

        if (!transaction) {
            return null;
        }

        setRedoStack((previous) => previous.slice(0, -1));
        setUndoStack((previous) => [
            ...previous.slice(-(historyLimit - 1)),
            transaction,
        ]);
        return transaction;
    }

    function clear() {
        setUndoStack([]);
        setRedoStack([]);
    }

    return {
        undoStack,
        redoStack,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        pushTransaction,
        undo,
        redo,
        clear,
    };
}
