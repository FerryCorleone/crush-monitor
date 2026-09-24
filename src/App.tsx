import { useVirtualizer } from "@tanstack/react-virtual";
import {
  loadConversation,
  saveConversation,
  type SavedConversation,
} from "./storage";
import { INTENTS, topIntents } from "../shared/intents";
import { REPLY_RATINGS, replyRating } from "../shared/ratings";
import { EMOTIONS, topEmotions } from "../shared/labels";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  Heart,
  MoreHorizontal,
  X,
  ArrowUpRight,
  RotateCcw,
  MessageCircle,
  Settings2,
  Plus,
  ArrowRight,
  Send,
  Check,
} from "lucide-react";
import { parseChat, toMessages, mergeMessages } from "../shared/parser";
import {
  RUBRIC,
  ACTIONS,
  RELATIONS,
  statusLabel,
  meanQuality,
  type Message,
  type Relation,
  type Parsed,
} from "../shared/types";
import { exampleText } from "../shared/fixtures";
import { useAnalysis } from "./useAnalysis";
import { currentAction } from "../shared/action";

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select,textarea,input",
          ) || [],
        );
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" aria-label="关闭" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const a = useAnalysis();
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [self, setSelf] = useState(""),
    [other, setOther] = useState("Crush"),
    [relation, setRelation] = useState<Relation>("crush");
  const [raw, setRaw] = useState(""),
    [parsed, setParsed] = useState<Parsed[]>([]),
    [role, setRole] = useState(""),
    [importing, setImporting] = useState(false),
    [settings, setSettings] = useState(false),
    [detail, setDetail] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const [overlap, setOverlap] = useState<Message[] | null>(null);
  const [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 150,
    getItemKey: useCallback((i: number) => messages[i].id, [messages]),
    overscan: 8,
    anchorTo: "end",
    followOnAppend: true,
    scrollEndThreshold: 100,
  });
  useEffect(() => {
    let live = true;
    loadConversation()
      .then((saved) => {
        if (!live) return;
        if (saved?.schema === 1) {
          setMessages(saved.messages);
          setSelf(saved.self);
          setOther(saved.other);
          setRelation(saved.relation);
          a.restore(saved);
        }
        setReady(true);
      })
      .catch(() => {
        if (live) {
          setStorageError(
            "本机记录读取失败，请检查浏览器存储权限。为避免覆盖旧记录，暂不自动保存。",
          );
          setReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  const pendingSave = useRef<SavedConversation | null>(null),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    lastSavedMessages = useRef<Message[] | null>(null);
  const flushSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    void saveConversation(pendingSave.current).catch(() =>
      setStorageError(
        "本机保存失败，可能存储空间不足。当前页面仍可使用，请勿刷新以免丢失未保存记录。",
      ),
    );
  };
  useEffect(() => {
    if (!ready || storageError) return;
    pendingSave.current = messages.length
      ? {
          schema: 1,
          rubric: RUBRIC,
          messages,
          self,
          other,
          relation,
          lines: a.lines,
          events: a.events,
          overview: a.overview,
          trend: a.trend,
          analyzedCount: a.analyzedCount,
          completed: a.status === "complete",
        }
      : null;
    if (lastSavedMessages.current !== messages || a.status !== "loading") {
      lastSavedMessages.current = messages;
      flushSave();
    } else if (!saveTimer.current)
      saveTimer.current = setTimeout(flushSave, 750);
  }, [
    ready,
    messages,
    self,
    other,
    relation,
    a.lines,
    a.events,
    a.overview,
    a.trend,
    a.analyzedCount,
    a.status,
  ]);
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) flushSave();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);
  const stay = useRef(true);
  useEffect(() => {
    if (messages.length && stay.current)
      virtual.scrollToIndex(messages.length - 1, { align: "end" });
  }, [messages.length]);
  const busy = a.status === "loading",
    ov = a.overview,
    value = ov?.affinity.value,
    quality = meanQuality(messages, a.lines);
  const actionOverview = currentAction(ov, messages, a.overviewFresh);
  const actionLabel = actionOverview
    ? ACTIONS[actionOverview.action]?.label
    : busy
      ? "正在更新…"
      : messages.length
        ? "建议待更新"
        : "等你导入聊天";
  const last = a.trend.at(-1),
    previous = a.trend.at(-2);
  const delta =
    a.status === "complete" && last?.value != null && previous?.value != null
      ? last.value - previous.value
      : null;
  function start(ms: Message[]) {
    setMessages(ms);
    setInput("");
    a.run(ms, relation);
  }
  function add(ms: Message[], mode: "auto" | "append" | "skip" = "auto") {
    const m = mergeMessages(messages, ms, mode);
    if (m.ambiguous) {
      setOverlap(ms);
      return;
    }
    if (!m.added) {
      setNotice("没有新增消息，这段已经分析过了。");
      setInput("");
      return;
    }
    setNotice("");
    start(m.messages);
  }
  function prepare(text: string) {
    if (!text.trim()) return;
    if (text.length > 250000) {
      setNotice("这次粘贴超过25万字符，请分几次追加；历史记录不会被截断。");
      return;
    }
    const p = parseChat(text);
    const names = [...new Set(p.messages.map((x) => x.speaker))];
    if (
      messages.length &&
      self &&
      !p.warnings.length &&
      names.every((n) => n === self || n === other)
    ) {
      add(toMessages(p.messages, self));
      return;
    }
    setRaw(text);
    setParsed(p.messages);
    setRole(names.includes(self) ? self : names.includes("我") ? "我" : "");
    setImporting(true);
  }
  function confirmImport() {
    const names = [...new Set(parsed.map((x) => x.speaker))];
    setSelf(role);
    setOther(names.find((n) => n !== role) || "Crush");
    setImporting(false);
    add(toMessages(parsed, role));
  }
  function clear() {
    a.reset();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingSave.current = null;
    void saveConversation(null)
      .then(() => setStorageError(""))
      .catch(() => setStorageError("本机记录删除失败，请重试清空。"));
    setMessages([]);
    setInput("");
    setSelf("");
    setOther("Crush");
    setNotice("");
    setSettings(false);
    setDetail(null);
  }
  const names = [...new Set(parsed.map((x) => x.speaker))];
  const chosen = messages.find((m) => m.id === detail),
    result = detail ? a.lines[detail] : undefined;
  return (
    <main className="app">
      <div className="workspace">
        <section className="wechat" aria-label="微信聊天">
          <nav className="chat-rail" aria-label="聊天工具">
            <div className="rail-avatar">
              {self && self !== "__self_absent__" ? self.slice(0, 1) : "我"}
            </div>
            <button
              className="rail-active"
              aria-label="滚动到最新聊天"
              onClick={() => {
                stay.current = true;
                if (messages.length)
                  virtual.scrollToIndex(messages.length - 1, { align: "end" });
              }}
            >
              <MessageCircle size={23} />
            </button>
            <button
              className="rail-settings"
              aria-label="聊天设置"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={22} />
            </button>
          </nav>
          <header className="chat-head">
            <div className="contact-title">
              <h2>{messages.length ? other : "微信聊天"}</h2>
              <span>{RELATIONS[relation]}</span>
            </div>
            <button
              className="header-affinity"
              onClick={() => setDetail("overview")}
              aria-label="查看好感度详情"
            >
              <span>好感度</span>
              <strong key={value} className="affinity-number">
                {value ?? "—"}
              </strong>
              {value != null && (
                <span className="affinity-hearts" aria-hidden="true">
                  <Heart className="affinity-heart heart-one" size={12} />
                  <Heart className="affinity-heart heart-two" size={9} />
                  <Heart className="affinity-heart heart-three" size={7} />
                </span>
              )}
              {delta != null && delta !== 0 && (
                <small>
                  {delta > 0 ? "+" : ""}
                  {delta}
                </small>
              )}
            </button>
            <div className="header-tools">
              <button
                className="icon"
                aria-label="新聊天"
                title="新聊天"
                onClick={() => setDetail("clear")}
              >
                <Plus size={20} />
              </button>
              <button
                className="icon"
                aria-label="更多聊天设置"
                onClick={() => setSettings(true)}
              >
                <MoreHorizontal size={24} />
              </button>
            </div>
          </header>
          <div
            ref={scroller}
            className="chat-scroll"
            onScroll={(e) => {
              const el = e.currentTarget;
              stay.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            }}
          >
            {!messages.length ? (
              <div className="empty">
                <h2>粘贴聊天记录</h2>
                <p>支持微信、QQ 复制记录及 WhatsApp 文本导出</p>
                <button
                  className="text-button"
                  onClick={() => prepare(exampleText(0))}
                >
                  用一段示例试试 <ArrowUpRight size={16} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  height: virtual.getTotalSize(),
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtual.getVirtualItems().map((row) => {
                  const i = row.index,
                    m = messages[i];
                  const r = a.lines[m.id];

                  return (
                    <div
                      key={m.id}
                      data-index={row.index}
                      ref={virtual.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${row.start}px)`,
                      }}
                      id={`message-${m.id}`}
                      className={`message ${m.sender}`}
                    >
                      {(i === 0 || m.timestamp !== messages[i - 1].timestamp) &&
                        m.timestamp && (
                          <div className="timestamp">
                            {m.timestamp.replace(/^\d{4}年/, "")}
                          </div>
                        )}
                      <div className="message-row">
                        <div
                          className={`avatar ${m.sender === "self" ? "mine" : ""}`}
                        >
                          {(m.sender === "self" ? self : other).slice(0, 1)}
                        </div>
                        <div className="message-content">
                          <div className="bubble">{m.text}</div>
                          {m.kind === "text" && (
                            <div className={`message-tags ${m.sender}`}>
                              {r?.skipped ? (
                                <span className="pending-tag">{r.skipped}</span>
                              ) : m.sender === "other" ? (
                                <>
                                  <div className="analysis-row emotion-row">
                                    <span className="analysis-row-label">
                                      情绪
                                    </span>
                                    {r?.emotions ? (
                                      topEmotions(r.emotions).map((emotion) => (
                                        <button
                                          key={emotion.key}
                                          className={`emotion-tag emotion-${emotion.key}`}
                                          onClick={() => setDetail(m.id)}
                                          aria-label={`${emotion.label} ${emotion.percent}，查看情绪分析：${m.text}`}
                                        >
                                          <span>{emotion.label}</span>
                                          <b>{emotion.percent}</b>
                                        </button>
                                      ))
                                    ) : (
                                      <button
                                        className="pending-tag"
                                        disabled={busy}
                                        onClick={() =>
                                          a.run(messages, relation)
                                        }
                                      >
                                        {busy ? "分析中" : "分析情绪"}
                                      </button>
                                    )}
                                  </div>
                                  <div className="analysis-row intent-row">
                                    <span className="analysis-row-label">
                                      意图
                                    </span>
                                    {r?.intents ? (
                                      topIntents(r.intents).map((intent) => (
                                        <button
                                          key={intent.key}
                                          className="intent-tag"
                                          onClick={() => setDetail(m.id)}
                                          aria-label={`${intent.label} ${intent.percent}，查看意图分析：${m.text}`}
                                        >
                                          <span>{intent.label}</span>
                                          <b>{intent.percent}</b>
                                        </button>
                                      ))
                                    ) : (
                                      <button
                                        className="pending-tag"
                                        disabled={busy}
                                        onClick={() =>
                                          a.run(messages, relation)
                                        }
                                      >
                                        {busy ? "分析中" : "分析意图"}
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : r ? (
                                <button
                                  className="reply-tag"
                                  onClick={() => setDetail(m.id)}
                                  aria-label={`查看回复评价：${m.text}`}
                                >
                                  <span>回复评级：</span>
                                  <b>
                                    {replyRating(r.score.value)?.label ??
                                      "待判断"}
                                  </b>
                                </button>
                              ) : (
                                <button
                                  className="pending-tag"
                                  disabled={busy}
                                  onClick={() => a.run(messages, relation)}
                                >
                                  {busy ? "分析中" : "评价回复"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="chat-insights">
            <button
              className="reply-summary"
              onClick={() => setDetail("performance")}
            >
              <span>我的发挥</span>
              <strong>{replyRating(quality)?.label ?? "—"}</strong>
              {quality != null && <span>{quality}分</span>}
            </button>
            <span className="insight-divider" />
            <button
              className="action-summary"
              onClick={() => setDetail("action")}
            >
              <span>下一步</span>
              <strong>{actionLabel}</strong>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="composer">
            <textarea
              aria-label="粘贴聊天记录"
              disabled={!ready}
              placeholder={
                messages.length
                  ? "粘贴新的聊天，自动合并重复记录"
                  : "在这里粘贴聊天记录…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text");
                if (t.trim()) {
                  e.preventDefault();
                  setInput(t);
                  prepare(t);
                }
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                  prepare(input);
              }}
            />
            <div className="composer-bottom">
              <div className="composer-feedback">
                <span role="status">{storageError || notice}</span>{" "}
                <div className="analysis-status" aria-live="polite">
                  {busy ? (
                    <>
                      <span className="working" />
                      正在分析 {a.progress.done}/{a.progress.total}
                      <button onClick={a.cancel}>停止</button>
                    </>
                  ) : a.status === "error" ? (
                    <>
                      <span>分析未完成</span>
                      <button onClick={() => a.run(messages, relation)}>
                        <RotateCcw size={14} />
                        重试
                      </button>
                    </>
                  ) : a.status === "complete" ? (
                    <span className="completed">
                      <Check size={14} />
                      分析完成
                      <button onClick={() => setDetail("overview")}>
                        娱乐参考
                      </button>
                    </span>
                  ) : messages.length ? (
                    <>
                      <span>分析已暂停</span>
                      <button onClick={() => a.run(messages, relation)}>
                        继续分析
                      </button>
                    </>
                  ) : null}
                </div>
                {a.error && <span className="error">{a.error}</span>}
              </div>
              <button
                className="send"
                disabled={!input.trim()}
                onClick={() => prepare(input)}
              >
                <Send size={15} />
                分析聊天
              </button>
            </div>
          </div>
        </section>
      </div>
      {importing && (
        <Modal title="确认聊天里的你" close={() => setImporting(false)}>
          <div className="role-options">
            {names
              .filter((n) => n !== "未分配")
              .map((n) => (
                <button
                  className={role === n ? "selected" : ""}
                  key={n}
                  onClick={() => setRole(n)}
                >
                  {n}
                </button>
              ))}
            {names.length === 1 && (
              <button
                className={role === "__self_absent__" ? "selected" : ""}
                onClick={() => setRole("__self_absent__")}
              >
                这些都是对方的话
              </button>
            )}
          </div>
          <label className="field">
            识别到 {parsed.length} 条聊天
            <textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setParsed(parseChat(e.target.value).messages);
              }}
            />
          </label>
          {(names.length > 2 || names.includes("未分配")) && (
            <p className="error">
              请保留两个人的聊天，可改成「我：内容」「对方：内容」。
            </p>
          )}
          <button
            className="primary"
            disabled={
              !role ||
              !parsed.length ||
              names.length > 2 ||
              names.includes("未分配") ||
              (!names.includes(role) && role !== "__self_absent__")
            }
            onClick={confirmImport}
          >
            开始分析
          </button>
        </Modal>
      )}
      {settings && (
        <Modal title="聊天设置" close={() => setSettings(false)}>
          <label className="field">
            你们的关系
            <select
              value={relation}
              onChange={(e) => {
                const r = e.target.value as Relation;
                setRelation(r);
                if (messages.length) a.run(messages, r);
              }}
            >
              {Object.entries(RELATIONS).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary"
            disabled={!messages.length}
            onClick={() => {
              const ms = messages.map((m) => ({
                ...m,
                sender:
                  m.sender === "self" ? ("other" as const) : ("self" as const),
              }));
              setSelf(other);
              setOther(self === "__self_absent__" ? "我" : self);
              setMessages(ms);
              a.reset();
              a.run(ms, relation);
              setSettings(false);
            }}
          >
            交换双方身份
          </button>
          <button className="secondary danger" onClick={clear}>
            清空聊天，重新开始
          </button>
          <p>
            已保存 {messages.length.toLocaleString()}{" "}
            条聊天。记录保存在本机浏览器，刷新后可继续；分析时只发送所需片段给模型服务。清空会删除本机记录。
          </p>
        </Modal>
      )}
      {detail === "clear" && (
        <Modal title="开始新的聊天？" close={() => setDetail(null)}>
          <p>当前聊天、分析和本机保存的记录都会删除。</p>
          <button className="primary" onClick={clear}>
            开始新聊天
          </button>
          <button className="secondary" onClick={() => setDetail(null)}>
            保留当前聊天
          </button>
        </Modal>
      )}
      {detail && detail !== "clear" && (
        <Modal
          title={
            detail === "overview"
              ? "好感度"
              : detail === "action"
                ? "下一步"
                : detail === "performance"
                  ? "我的发挥"
                  : chosen?.sender === "other"
                    ? "情绪与意图"
                    : "回复评价"
          }
          close={() => setDetail(null)}
        >
          {detail === "overview" ? (
            <>
              <p>
                0—100 是模型对这段聊天的好感信号评分，不是「对方喜欢你的概率」。
              </p>
              <p>
                根据近期对话和相关历史原话评分，旧分数不参与计算。证据少时仍保留分数供娱乐参考。
              </p>
              {!!ov?.memoryEvidenceIds?.length && (
                <details>
                  <summary>参考的历史原话</summary>
                  {[...new Set(ov.memoryEvidenceIds)].map((id) => {
                    const m = messages.find((m) => m.id === id);
                    return m ? (
                      <blockquote key={id}>
                        {m.sender === "self" ? self : other}：{m.text}
                      </blockquote>
                    ) : null;
                  })}
                </details>
              )}
              {ov?.affinityDimensions && (
                <div className="affinity-breakdown">
                  {ov.affinityDimensions.map((d) => (
                    <div key={d.key}>
                      <span>{d.label}</span>
                      <meter
                        min="0"
                        max="100"
                        value={d.judgment.value ?? 0}
                        aria-label={`${d.label} ${d.judgment.value} 分`}
                      />
                      <strong>{d.judgment.value}</strong>
                      <small>
                        占 {d.weight}% · {statusLabel(d.judgment)}
                      </small>
                    </div>
                  ))}
                </div>
              )}
              {ov?.boundaryApplied && (
                <p>
                  对方表达了明确且仍有效的拒绝边界。综合原分{" "}
                  {ov.affinityRawValue}，最终好感度最多显示 25 分。
                </p>
              )}
              {ov && (
                <p>
                  本轮判断：{statusLabel(ov.affinity)}。综合确定度{" "}
                  {Math.round(ov.affinity.confidence * 100)}%。
                </p>
              )}
            </>
          ) : detail === "action" ? (
            <>
              <h3>{actionLabel}</h3>
              <p>
                {actionOverview
                  ? ACTIONS[actionOverview.action]?.detail
                  : busy
                    ? "正在根据最新聊天更新建议。"
                    : messages.length
                      ? "最新聊天的建议尚未更新，请重新分析。"
                      : "导入后生成建议。"}
              </p>
              {actionOverview?.actionEvidenceId && (
                <blockquote>
                  {
                    messages.find(
                      (m) => m.id === actionOverview.actionEvidenceId,
                    )?.text
                  }
                </blockquote>
              )}
              {!actionOverview && !busy && !!messages.length && (
                <button onClick={() => a.run(messages, relation)}>
                  重新分析
                </button>
              )}
            </>
          ) : detail === "performance" ? (
            <>
              <div className="detail-score">
                {quality ?? "—"}
                <span>/100</span>
              </div>
              <p>
                已完成分析的我方回复平均分。Jev
                根据发出时的前文评价表达质量，再按固定分数区间显示评级。
              </p>
              <div className="reply-guide">
                {REPLY_RATINGS.map((v) => (
                  <p key={v.label}>
                    <strong>
                      {v.label} · {v.range} 分
                    </strong>
                    ：{v.description}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <>
              <blockquote>{chosen?.text}</blockquote>
              {chosen?.sender === "other" ? (
                <>
                  <h3>情绪</h3>
                  <div className="emotion-distribution">
                    {Object.entries(result?.emotions || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, p]) => (
                        <div key={key}>
                          <span>
                            {EMOTIONS[key as keyof typeof EMOTIONS]?.label ||
                              key}
                          </span>
                          <div className="probability-track">
                            <i style={{ width: `${p * 100}%` }} />
                          </div>
                          <b>
                            {p > 0 && p < 0.005
                              ? "<1%"
                              : `${Math.round(p * 100)}%`}
                          </b>
                        </div>
                      ))}
                  </div>
                  <h3 className="intent-detail-heading">意图</h3>
                  <div className="intent-distribution">
                    {Object.entries(result?.intents || {})
                      .filter(([key, p]) => key in INTENTS && p > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, p]) => (
                        <div key={key} className="intent-detail-item">
                          <div>
                            <strong>
                              {INTENTS[key as keyof typeof INTENTS].label}
                            </strong>
                            <b>
                              {p < 0.005 ? "<1%" : `${Math.round(p * 100)}%`}
                            </b>
                          </div>
                          <p>{INTENTS[key as keyof typeof INTENTS].criteria}</p>
                        </div>
                      ))}
                    {!result?.intents && <p>意图尚未分析。</p>}
                  </div>
                  <p>
                    两行分别展示主要情绪与主要沟通意图的候选解读，不代表测量真实内心。每行最多显示前三项，保留原始概率，不重新凑成
                    100%。
                  </p>
                </>
              ) : (
                <>
                  <h3 className="reply-verdict">
                    回复评级：
                    {replyRating(result?.score.value)?.label ?? "待判断"}
                  </h3>
                  <p>
                    {replyRating(result?.score.value)?.description ??
                      "当前语境不足以判断表达质量"}
                  </p>
                  <p>
                    回复评分 {result?.score.value ?? "—"} / 100 ·{" "}
                    {result && statusLabel(result.score)}
                  </p>
                </>
              )}
              <p>结合当前已导入的上下文判断，不代表对方真实想法。</p>
            </>
          )}
        </Modal>
      )}
      {overlap && (
        <Modal title="这段可能重复了" close={() => setOverlap(null)}>
          <p>相同内容也可能是新消息，请选择如何合并。</p>
          <button
            className="primary"
            onClick={() => {
              add(overlap, "skip");
              setOverlap(null);
            }}
          >
            跳过重合部分
          </button>
          <button
            className="secondary"
            onClick={() => {
              add(overlap, "append");
              setOverlap(null);
            }}
          >
            作为新消息追加
          </button>
        </Modal>
      )}
    </main>
  );
}
