"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  testSendNotificationAction,
  upsertNotificationTemplateAction,
} from "@/modules/notify/actions";
import {
  calculateSmsSegments,
  NOTIFICATION_EVENTS,
  renderTemplate,
} from "@/modules/notify/service";

export interface NotificationsManagerProps {
  templates: ReadonlyArray<{
    id: string;
    channel: string;
    key: string;
    subject: string | null;
    body: string;
  }>;
  logs: ReadonlyArray<{
    id: string;
    channel: string;
    recipient: string;
    template: string;
    status: string;
    attempts: number;
    error: string | null;
  }>;
}

const INPUT_CLS =
  "w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS =
  "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5";

export function NotificationsManager({
  templates,
  logs,
}: NotificationsManagerProps) {
  const router = useRouter();
  const [channel, setChannel] = useState<"email" | "sms" | "push">("sms");
  const [key, setKey] = useState<string>(NOTIFICATION_EVENTS[0]);
  const [subject, setSubject] = useState("Order {{orderNumber}} update");
  const [body, setBody] = useState(
    "Hello {{name}}, your order {{orderNumber}} is confirmed.",
  );
  const [testRecipient, setTestRecipient] = useState("01712345678");
  const [feedback, setFeedback] = useState<string | null>(null);

  const preview = renderTemplate(body, {
    name: "Karim",
    orderNumber: "ORD-20261120-ABC123",
    total: "৳1,250",
  });
  const smsInfo = calculateSmsSegments(preview);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await upsertNotificationTemplateAction({
      channel,
      key,
      subject: channel === "sms" ? undefined : subject,
      body,
      vars: ["name", "orderNumber", "total"],
    });
    if (!res.ok) {
      setFeedback(res.message);
      return;
    }
    setFeedback("Template saved");
    router.refresh();
  }

  async function handleTestSend() {
    if (channel === "push") {
      return;
    }
    const res = await testSendNotificationAction({
      channel,
      recipient: testRecipient,
      subject,
      body,
      sampleVars: { name: "Karim", orderNumber: "ORD-TEST", total: "৳1,250" },
    });
    setFeedback(res.ok ? `Test sent (${res.data.providerId})` : res.message);
  }

  return (
    <div className="space-y-4">
      {feedback !== null && (
        <div
          role="status"
          className="p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 m-0">
              Template Editor
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="nt-channel" className={LABEL_CLS}>
                  Channel
                </label>
                <select
                  id="nt-channel"
                  className={INPUT_CLS}
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as "email" | "sms" | "push")
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>
              </div>

              <div>
                <label htmlFor="nt-key" className={LABEL_CLS}>
                  Event Key
                </label>
                <select
                  id="nt-key"
                  className={INPUT_CLS}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                >
                  {NOTIFICATION_EVENTS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>

              {channel !== "sms" && (
                <div>
                  <label htmlFor="nt-subject" className={LABEL_CLS}>
                    Subject
                  </label>
                  <input
                    id="nt-subject"
                    type="text"
                    className={INPUT_CLS}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label htmlFor="nt-body" className={LABEL_CLS}>
                  Body (Handlebars: {"{{name}}, {{orderNumber}}"})
                </label>
                <textarea
                  id="nt-body"
                  rows={3}
                  className={INPUT_CLS}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="p-4 rounded bg-slate-50 border border-slate-200/80 text-sm text-slate-700 space-y-1">
                <div>
                  <strong className="text-slate-900">Preview:</strong> {preview}
                </div>
                {channel === "sms" && (
                  <div className="text-xs text-slate-500">
                    {smsInfo.encoding.toUpperCase()} • {smsInfo.length} chars •{" "}
                    {smsInfo.segments} segment(s)
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded shadow-md shadow-indigo-600/25 transition"
              >
                Save Template
              </button>
            </form>

            {channel !== "push" && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2.5">
                <input
                  type="text"
                  aria-label="Test recipient"
                  className={INPUT_CLS}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleTestSend}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold whitespace-nowrap transition"
                >
                  Test Send
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/80">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Saved Templates ({templates.length})
              </h3>
            </div>
            {templates.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                No templates saved yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
                {templates.map((t) => (
                  <li key={t.id} className="p-4 space-y-1">
                    <div className="text-sm font-semibold text-slate-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 mr-2 uppercase">
                        {t.channel}
                      </span>
                      {t.key}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.body.slice(0, 80)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 m-0">
            Delivery Logs ({logs.length})
          </h3>
        </div>
        {logs.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No notification logs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Template</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold uppercase text-xs">
                      {l.channel}
                    </td>
                    <td className="py-2.5 px-4">{l.template}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {l.recipient}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">{l.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
