import type { Response } from "express";

import type { AgentStreamEvent } from "../../src/types/agentStream";

export function writeSseEvent(response: Response, event: AgentStreamEvent) {
    response.write(`id: ${event.id}\n`);
    response.write(`event: ${event.type}\n`);
    response.write(`data: ${JSON.stringify(event)}\n\n`);
}
