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
    <div>
      {feedback !== null && (
        <div role="status" className="card-panel teal lighten-5">
          {feedback}
        </div>
      )}

      <div className="row">
        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Template Editor</span>
              <form onSubmit={handleSave}>
                <label htmlFor="nt-channel">Channel</label>
                <select
                  id="nt-channel"
                  className="browser-default"
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as "email" | "sms" | "push")
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>

                <label htmlFor="nt-key">Event Key</label>
                <select
                  id="nt-key"
                  className="browser-default"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                >
                  {NOTIFICATION_EVENTS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>

                {channel !== "sms" && (
                  <div className="input-field">
                    <label htmlFor="nt-subject" className="active">
                      Subject
                    </label>
                    <input
                      id="nt-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}

                <div className="input-field">
                  <label htmlFor="nt-body" className="active">
                    Body (Handlebars vars: {"{{name}}, {{orderNumber}}"})
                  </label>
                  <textarea
                    id="nt-body"
                    className="materialize-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>

                <div className="card-panel grey lighten-4">
                  <strong>Preview:</strong> {preview}
                  {channel === "sms" && (
                    <div className="grey-text" style={{ fontSize: "0.85rem" }}>
                      {smsInfo.encoding.toUpperCase()} • {smsInfo.length} chars •{" "}
                      {smsInfo.segments} segment(s)
                    </div>
                  )}
                </div>

                <button type="submit" className="btn">
                  Save Template
                </button>
              </form>

              {channel !== "push" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <input
                    type="text"
                    aria-label="Test recipient"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-small teal"
                    onClick={handleTestSend}
                  >
                    Test Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">
                Saved Templates ({templates.length})
              </span>
              <ul className="collection">
                {templates.map((t) => (
                  <li key={t.id} className="collection-item">
                    <strong>
                      [{t.channel}] {t.key}
                    </strong>
                    <div className="grey-text">{t.body.slice(0, 80)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Delivery Logs ({logs.length})</span>
          <table className="striped">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Template</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.channel}</td>
                  <td>{l.template}</td>
                  <td>{l.recipient}</td>
                  <td>{l.status}</td>
                  <td>{l.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
