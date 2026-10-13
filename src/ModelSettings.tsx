import {
  preferredModel,
  modelLabel,
  isTextAnalysisModel,
} from "../shared/model-selection";
import { useState, useRef, useEffect } from "react";
import {
  MODEL_PRESETS,
  type ModelSettings as Settings,
  type PublicSettings,
} from "../shared/model-presets";
export function ModelSettings({
  initial,
  saved,
}: {
  initial: PublicSettings;
  saved: (s: PublicSettings) => void;
}) {
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const discoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const modelInput = useRef<HTMLInputElement>(null);
  const [modelError, setModelError] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => () => request.current?.abort(), []);
  const [form, setForm] = useState<Settings>({
    preset: initial.preset,
    protocol: initial.protocol,
    baseUrl: initial.baseUrl,
    model: initial.model,
    jsonMode: initial.jsonMode,
    apiKey: "",
  });
  const [models, setModels] = useState<string[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const preset = MODEL_PRESETS.find((p) => p.id === form.preset)!;
  const sameKey =
    initial.hasKey &&
    form.preset === initial.preset &&
    form.baseUrl === initial.baseUrl &&
    form.protocol === initial.protocol;
  function select(id: string) {
    const p = MODEL_PRESETS.find((p) => p.id === id)!;
    setForm({
      preset: id,
      protocol: p.protocol,
      baseUrl: p.baseUrl,
      model: p.model,
      jsonMode: true,
      apiKey: "",
    });
    request.current?.abort();
    sequence.current++;
    setBusy("");
    setModels([]);
    setModelError("");
    setFilter("");
    setPickerOpen(false);
    setError("");
  }
  async function submit(action: "save" | "models") {
    if (discoveryTimer.current) clearTimeout(discoveryTimer.current);
    discoveryTimer.current = null;
    request.current?.abort();
    const ticket = ++sequence.current;
    setBusy(action);
    if (action === "models") setModelError("");
    else setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const res = await fetch("/api/settings/" + action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-config-token": initial.token,
        },
        body: JSON.stringify(form),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(action === "save" ? 45000 : 18000),
        ]),
      });
      const data = await res.json();
      if (ticket !== sequence.current) return;
      if (!res.ok) throw new Error(data.error || "连接失败，请重试。");
      if (action === "save") {
        setForm((f) => ({ ...f, apiKey: "" }));
        saved(data);
      } else {
        const ids: string[] = [...new Set<string>(data.models)].filter(
          isTextAnalysisModel,
        );
        setModels(ids);
        setFilter("");
        setPickerOpen(!!ids.length);
        if (ids.length)
          setForm((f) => ({
            ...f,
            model: preferredModel(ids, f.model, f.preset),
          }));
        else setModelError("平台未提供模型列表，可以手动填写模型 ID。");
      }
    } catch (e) {
      if (!controller.signal.aborted && ticket === sequence.current) {
        if (action === "models") {
          setModelError("读取模型失败：" + (e as Error).message);
          setPickerOpen(false);
        } else
          setError(
            (e as Error).name === "TimeoutError"
              ? "检测超过 45 秒，请换一个快速文本型号或稍后重试。"
              : (e as Error).message,
          );
      }
    } finally {
      if (ticket === sequence.current) setBusy("");
    }
  }
  useEffect(() => {
    setBusy("");
    setModels([]);
    setModelError("");
    setError("");
    setFilter("");
    if (
      form.protocol === "jev" ||
      form.protocol === "decisions" ||
      (!form.apiKey.trim() && !sameKey) ||
      !form.baseUrl
    )
      return;
    discoveryTimer.current = setTimeout(() => void submit("models"), 600);
    return () => {
      if (discoveryTimer.current) clearTimeout(discoveryTimer.current);
      request.current?.abort();
      sequence.current++;
    };
  }, [form.preset, form.apiKey, form.baseUrl, form.protocol]);
  useEffect(() => {
    if (busy !== "save") return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  function chooseModel(model: string) {
    setForm((f) => ({ ...f, model }));
    setPickerOpen(false);
    setFilter("");
    setError("");
    modelInput.current?.focus();
  }
  const visibleModels = models.filter((m) =>
    m.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <form
      className="model-settings"
      onSubmit={(e) => {
        e.preventDefault();
        void submit("save");
      }}
    >
      <p className="model-intro">选好模型，就可以开始读聊天了。</p>
      <fieldset disabled={busy === "save"}>
        <label className="field">
          模型服务商
          <select value={form.preset} onChange={(e) => select(e.target.value)}>
            {MODEL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span className="field-heading">
            <label htmlFor="model-api-key">API Key</label>{" "}
            {preset.keyUrl && (
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                去获取 ↗
              </a>
            )}
          </span>
          <input
            id="model-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={
              sameKey ? "已保存；留空继续使用" : "粘贴这个平台的 API Key"
            }
            required={!sameKey}
          />
        </div>
        {form.preset === "custom" && (
          <>
            <label className="field">
              接口类型
              <select
                value={form.protocol}
                onChange={(e) =>
                  setForm({
                    ...form,
                    protocol: e.target.value as Settings["protocol"],
                    apiKey: "",
                  })
                }
              >
                <option value="openai">OpenAI Chat Completions</option>
                <option value="anthropic">Anthropic Messages</option>
              </select>
            </label>
            <label className="field">
              Base URL
              <input
                value={form.baseUrl}
                onChange={(e) =>
                  setForm({ ...form, baseUrl: e.target.value, apiKey: "" })
                }
                placeholder="https://your-provider.com/v1"
                required
              />
            </label>
          </>
        )}
        {form.protocol !== "jev" && form.protocol !== "decisions" && (
          <>
            <div className="field">
              <span className="field-heading">
                <label htmlFor="model-id">选择模型</label>
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    busy === "models" ||
                    (!form.apiKey && !sameKey) ||
                    !form.baseUrl
                  }
                  onClick={() => void submit("models")}
                >
                  {busy === "models" ? "读取中…" : "刷新模型列表"}
                </button>
              </span>
              {busy === "models" && (
                <span className="model-list-status" role="status">
                  正在读取平台的文本模型…
                </span>
              )}
              <div
                className="model-picker"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setPickerOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setPickerOpen(false);
                    modelInput.current?.focus();
                  }
                  if (e.key === "ArrowDown" && !pickerOpen && models.length) {
                    e.preventDefault();
                    setFilter("");
                    setPickerOpen(true);
                  }
                }}
              >
                <div className="model-value">
                  <input
                    ref={modelInput}
                    id="model-id"
                    aria-label="模型 ID"
                    value={form.model}
                    onChange={(e) => {
                      setForm({ ...form, model: e.target.value });
                      setPickerOpen(false);
                      setError("");
                    }}
                    onClick={() => {
                      if (models.length) {
                        setFilter("");
                        setPickerOpen(true);
                      }
                    }}
                    placeholder="选择型号，也可以直接输入模型 ID"
                    required
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="model-picker-toggle"
                    aria-label="展开模型列表"
                    aria-expanded={pickerOpen}
                    disabled={!models.length}
                    onClick={() => {
                      setFilter("");
                      setPickerOpen(!pickerOpen);
                    }}
                  >
                    ⌄
                  </button>
                </div>
                {pickerOpen && models.length > 0 && (
                  <div className="model-picker-panel">
                    <input
                      aria-label="搜索模型"
                      placeholder="搜索型号，例如 qwen、deepseek、kimi"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    <div
                      className="model-options"
                      role="listbox"
                      aria-label="平台模型"
                    >
                      {visibleModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="option"
                          aria-selected={m === form.model}
                          onClick={() => chooseModel(m)}
                        >
                          {modelLabel(m, form.preset)}
                          {m === form.model && (
                            <span aria-hidden="true">✓</span>
                          )}
                        </button>
                      ))}
                      {!visibleModels.length && (
                        <p className="model-list-status">
                          没有匹配的型号，可在上方直接填写 ID。
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {modelError && (
                <span className="model-list-status" role="status">
                  {modelError}
                </span>
              )}
            </div>
            <details className="model-advanced">
              <summary>连接选项</summary>
              <p>{form.baseUrl}</p>
              {form.protocol === "openai" && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.jsonMode}
                    onChange={(e) =>
                      setForm({ ...form, jsonMode: e.target.checked })
                    }
                  />{" "}
                  使用 JSON 模式（接口不支持时可关闭）
                </label>
              )}
            </details>
          </>
        )}
      </fieldset>
      {error && (
        <p className="model-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy === "save"} type="submit">
        {busy === "save" ? `正在检测连接 · ${elapsed} 秒` : "检测连接并保存"}
      </button>
      {busy === "save" && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            request.current?.abort();
            sequence.current++;
            setBusy("");
            setError("检测已取消，可选择其他型号重试。");
          }}
        >
          取消检测
        </button>
      )}
      <p className="model-footnote">
        Key
        只保存在本机服务，不存进浏览器。检测会使用少量额度；聊天仅在分析时发给所选平台。
      </p>
    </form>
  );
}
