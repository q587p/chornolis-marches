export type SocialTemplateContext = {
  actorName: string;
  targetDative: string;
  targetAccusative: string;
};

export type SocialDefinition = {
  id: string;
  label: string;
  actorMessage: (ctx: SocialTemplateContext) => string;
  targetMessage: (ctx: SocialTemplateContext) => string;
  roomMessage: (ctx: SocialTemplateContext) => string;
  targetlessActorMessage?: (ctx: SocialTemplateContext) => string;
  targetlessRoomMessage?: (ctx: SocialTemplateContext) => string;
};

export const SOCIAL_DEFINITIONS: SocialDefinition[] = [
  {
    id: "smile",
    label: "🙂 Усміхнутися",
    actorMessage: (ctx) => `Ви усміхаєтеся ${ctx.targetDative}.`,
    targetMessage: (ctx) => `${ctx.actorName} усміхається вам.`,
    roomMessage: (ctx) => `${ctx.actorName} усміхається ${ctx.targetDative}.`,
    targetlessActorMessage: () => "Ви усміхаєтеся.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} усміхається.`,
  },
  {
    id: "laugh",
    label: "😄 Засміятися",
    actorMessage: (ctx) => `Ви тихо смієтеся, дивлячись на ${ctx.targetAccusative}.`,
    targetMessage: (ctx) => `${ctx.actorName} тихо сміється, дивлячись на вас.`,
    roomMessage: (ctx) => `${ctx.actorName} тихо сміється, дивлячись на ${ctx.targetAccusative}.`,
    targetlessActorMessage: () => "Ви тихо смієтеся.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} тихо сміється.`,
  },
  {
    id: "nod",
    label: "✅ Кивнути",
    actorMessage: (ctx) => `Ви киваєте ${ctx.targetDative}.`,
    targetMessage: (ctx) => `${ctx.actorName} киває вам.`,
    roomMessage: (ctx) => `${ctx.actorName} киває ${ctx.targetDative}.`,
    targetlessActorMessage: () => "Ви киваєте.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} киває.`,
  },
  {
    id: "bow",
    label: "🙇 Вклонитися",
    actorMessage: (ctx) => `Ви вклоняєтеся ${ctx.targetDative}.`,
    targetMessage: (ctx) => `${ctx.actorName} вклоняється вам.`,
    roomMessage: (ctx) => `${ctx.actorName} вклоняється ${ctx.targetDative}.`,
    targetlessActorMessage: () => "Ви вклоняєтеся.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} вклоняється.`,
  },
  {
    id: "point",
    label: "👉 Вказати",
    actorMessage: (ctx) => `Ви вказуєте на ${ctx.targetAccusative}.`,
    targetMessage: (ctx) => `${ctx.actorName} вказує на вас.`,
    roomMessage: (ctx) => `${ctx.actorName} вказує на ${ctx.targetAccusative}.`,
  },
  {
    id: "glare",
    label: "😠 Насупитися",
    actorMessage: (ctx) => `Ви насуплено дивитеся на ${ctx.targetAccusative}.`,
    targetMessage: (ctx) => `${ctx.actorName} насуплено дивиться на вас.`,
    roomMessage: (ctx) => `${ctx.actorName} насуплено дивиться на ${ctx.targetAccusative}.`,
    targetlessActorMessage: () => "Ви насуплюєтеся.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} насуплюється.`,
  },
  {
    id: "sigh",
    label: "😮‍💨 Зітхнути",
    actorMessage: (ctx) => `Ви зітхаєте, дивлячись на ${ctx.targetAccusative}.`,
    targetMessage: (ctx) => `${ctx.actorName} зітхає, дивлячись на вас.`,
    roomMessage: (ctx) => `${ctx.actorName} зітхає, дивлячись на ${ctx.targetAccusative}.`,
    targetlessActorMessage: () => "Ви зітхаєте.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} зітхає.`,
  },
  {
    id: "wave",
    label: "👋 Помахати",
    actorMessage: (ctx) => `Ви махаєте ${ctx.targetDative}.`,
    targetMessage: (ctx) => `${ctx.actorName} махає вам.`,
    roomMessage: (ctx) => `${ctx.actorName} махає ${ctx.targetDative}.`,
    targetlessActorMessage: () => "Ви махаєте рукою.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} махає рукою.`,
  },
  {
    id: "hush",
    label: "🤫 Притишити",
    actorMessage: (ctx) => `Ви прикладаєте палець до вуст, дивлячись на ${ctx.targetAccusative}.`,
    targetMessage: (ctx) => `${ctx.actorName} прикладає палець до вуст, дивлячись на вас.`,
    roomMessage: (ctx) => `${ctx.actorName} прикладає палець до вуст, дивлячись на ${ctx.targetAccusative}.`,
    targetlessActorMessage: () => "Ви прикладаєте палець до вуст і просите тиші.",
    targetlessRoomMessage: (ctx) => `${ctx.actorName} прикладає палець до вуст і просить тиші.`,
  },
];
