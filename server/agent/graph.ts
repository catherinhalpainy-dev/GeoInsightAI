import {
    StateGraph,//创建工作流图
    StateSchema,//工作流保存那些状态
    START,//工作流起点
    END,//工作流终点
    Command,//告诉Graph接下来去哪，如何恢复
    interrupt,//暂停工作流等待外部输入
    MemorySaver,//保存暂停时工作流状态
    isInterrupted,//判断工作流是不是暂停了
    INTERRUPT,//读取暂停时携带的数据
} from "@langchain/langgraph";

import { z } from "zod";
import { AgentContext, AgentContextSchema, AgentPlanSchema } from "./schemas";
import { createAgentPlan, type CreateAgentPlanOptions } from "./planner";

//  GRAPH state
// 工作流运行期间，需要保存的数据
const AgentWorkflowState =
    new StateSchema({
        message:
            z.string(),

        context:
            AgentContextSchema,

        plan:
            AgentPlanSchema
                .nullable(),

        // Agent状态机状态
        status:
            z.enum([
                "planning",
                "waiting_approval",
                "approved",
                "rejected",
            ]),
    });

// 从前面定义的StateSchema自动得到TypeScript类型
type AgentWorkflowStateType =
    typeof AgentWorkflowState.State;


/* ==============================
   Plan Node ：调用AI生成AgentPlan
   ============================== */
// Node 工作流中一个处理步骤
async function planNode(
    state: AgentWorkflowStateType,
    plannerOptions: CreateAgentPlanOptions,
) {
    const plan =
        await createAgentPlan({
            message:
                state.message,

            context:
                state.context,
        }, plannerOptions);

    return {
        plan,
        status:
            plan.requiresConfirmation
                ? "waiting_approval"
                : "approved",
    } as const;
}

/* ==============================
   Review Node :检查node是否需要用户确认，需要则暂停整个graph
   ============================== */
function reviewNode(state: AgentWorkflowStateType,) {
    const plan = state.plan;
    if (!plan) {
        throw new Error(
            "Agent 工作流缺少操作计划",
        );
    }

    // 不需要确认的操作，直接进入approve
    if (!plan.requiresConfirmation) {
        return new Command({
            goto: "approve",
        });
    }

    // human in loop
    // 暂停当前LangGraph工作流，并把一份数据交给外部
    const approved =
        interrupt({
            type:
                "approval_required",

            summary:
                plan.summary,

            commands:
                plan.commands,
        }) as boolean;

    // 根据用户结果选择去哪
    return new Command({
        goto:
            approved
                ? "approve"
                : "reject",
    });

}

/* ==============================
   Approve Node :将state设置为approved
   ============================== */

function approveNode() {
    return {
        status:
            "approved",
    } as const;
}

/* ==============================
   Reject Node
   ============================== */

function rejectNode() {
    return {
        status:
            "rejected",
    } as const;
}

/* ==============================
   Checkpointer：临时存档，保存在服务器内存中
   ============================== */

const checkpointer =
    new MemorySaver();


/* ==============================
   Graph
   ============================== */
function createAgentGraph(plannerOptions: CreateAgentPlanOptions = {}) {
    return (
    // 创建一个LangGraph工作流
    new StateGraph(AgentWorkflowState,)
        .addNode(
            "create_plan",
            (state) => planNode(state, plannerOptions),
        )
        .addNode(
            "review",
            reviewNode,
            {
                ends: [
                    "approve",
                    "reject",
                ],
            },
        )

        .addNode(
            "approve",
            approveNode,
        )

        .addNode(
            "reject",
            rejectNode,
        )
        // Edge ：节点之间的连线
        .addEdge(
            START,
            "create_plan",
        )

        .addEdge(
            "create_plan",
            "review",
        )

        .addEdge(
            "approve",
            END,
        )

        .addEdge(
            "reject",
            END,
        )
        // 把Graph编译成可执行工作流
        .compile({
            checkpointer,
        })
    );
}


/* ==============================
   Result Formatter
   ============================== */
// 从langGraph的执行结果中提取interrupt时携带的数据
function getInterrupt(
    result: unknown,
) {
    if (
        !isInterrupted(result)
    ) {
        return null;
    }

    return result[INTERRUPT][0] ?? null;
}


/* ==============================
   Start Workflow
   ============================== */

export async function startAgentWorkflow(
    message: string,
    context: AgentContext,
    options: CreateAgentPlanOptions & { threadId: string },
) {
    const { threadId, ...plannerOptions } = options;
    const agentGraph = createAgentGraph(plannerOptions);

    const config = {
        configurable: {
            thread_id:
                threadId,
        },
    };

    // 真正运行
    const result =
        await agentGraph.invoke(
            {
                message,

                context,

                plan:
                    null,

                status:
                    "planning",
            },

            config,
        );

    const graphInterrupt = getInterrupt(result);
    return {
        threadId,
        status: result.status,
        plan: result.plan,
        interrupt: graphInterrupt?.value ?? null,
        interruptId: graphInterrupt?.id ?? null,
    };
}

/* ==============================
   Resume Workflow ：用户点击确认/拒绝后 恢复以前暂停的Graph
   ============================== */

export async function resumeAgentWorkflow(
  threadId: string,
  approved: boolean,
  interruptId: string | null,
) {
  const agentGraph = createAgentGraph();
  const config = {
    configurable: {
      thread_id:
        threadId,
    },
  };


  if (!approved && !interruptId) {
    throw new Error("Agent 工作流缺少待恢复的 interrupt id。");
  }

  // LangGraph 1.4 treats scalar `resume: false` as an empty command.
  // Addressing the interrupt explicitly preserves a real boolean rejection.
  const resumeValue = approved
    ? true
    : { [interruptId as string]: false };

  const result =
    await agentGraph.invoke(
      new Command({
        resume:
          resumeValue,
      }),

      config,
    );


  const graphInterrupt = getInterrupt(result);
  return {
    threadId,

    status:
      result.status,

    plan:
      result.plan,

    interrupt: graphInterrupt?.value ?? null,
    interruptId: graphInterrupt?.id ?? null,
  };
}
