"use client";

import { useActionState, useEffect, useState } from "react";
import { initialFormState, type FormState } from "@/lib/attendance/types";
import type { CodeState } from "@/app/attendance-actions";
import { QrCodeCard } from "./qr-code-card";

type Action = (previous: FormState, form: FormData) => Promise<FormState>;

function FormMessage({ state }: { state: FormState }) {
  return state.message && <div className={`attendance-notice attendance-notice-${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</div>;
}

export function SignOutForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction}><button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button><FormMessage state={state} /></form>;
}

function LocalDateInput({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState("");
  const [zone, setZone] = useState("your device’s local time");
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const date = new Date(value);
  return <><label htmlFor={`${name}-local`}>{label}</label><input id={`${name}-local`} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} required /><input type="hidden" name={name} value={Number.isFinite(date.getTime()) ? date.toISOString() : ""} /><p className="attendance-hint">Entered in {zone}. Event pages display Pacific time.</p></>;
}

export function ProfileForm({ name, action }: { name: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel"><h2>Your profile</h2><form action={formAction}><label htmlFor="profile-name">Your name</label><input id="profile-name" name="name" autoComplete="name" defaultValue={name} required minLength={2} maxLength={80} /><FormMessage state={state} /><button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>{pending ? "Saving…" : "Save name"}</button></form></section>;
}

export function CreateEventForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel"><h2>Create an attendance event</h2><p>Start with the event details. You’ll open check-in and generate its code on the next screen.</p><form action={formAction}><label htmlFor="event-title">Event name</label><input id="event-title" name="title" placeholder="General Body Meeting" minLength={2} maxLength={120} required /><LocalDateInput name="startsAt" label="Event date and time" /><label htmlFor="event-location">Location (optional)</label><input id="event-location" name="location" maxLength={160} /><FormMessage state={state} /><button className="attendance-button" type="submit" disabled={pending}>{pending ? "Creating…" : "Create event"}</button></form></section>;
}

export function EventCodeControls({ eventId, title, open, openAction, closeAction }: {
  eventId: string; title: string; open: boolean;
  openAction: (previous: CodeState, form: FormData) => Promise<CodeState>;
  closeAction: Action;
}) {
  const [state, openFormAction, pending] = useActionState(openAction, initialFormState as CodeState);
  const [closed, closeFormAction, closing] = useActionState(closeAction, initialFormState);
  const [showCode, setShowCode] = useState(false);
  useEffect(() => { setShowCode(state.status === "success"); }, [state]);
  useEffect(() => { if (closed.status === "success") setShowCode(false); }, [closed]);
  return <div className="attendance-section">
    {open && showCode && state.code && state.url && state.closesAt && <QrCodeCard code={state.code} url={state.url} eventTitle={title} closesAt={state.closesAt} />}
    <div className="attendance-grid attendance-section"><section className="attendance-panel"><h2>{open ? "Replace the event code" : "Open event check-in"}</h2><p>Choose when check-in should close. Generating a code opens check-in immediately and invalidates any previous code.</p><form action={openFormAction}><input type="hidden" name="eventId" value={eventId} /><LocalDateInput name="closesAt" label="Check-in closing time" />{(state.status !== "success" || open) && <FormMessage state={state} />}<button className="attendance-button" type="submit" disabled={pending || closing}>{pending ? "Generating…" : open ? "Generate replacement code" : "Generate code and QR"}</button></form></section>
    <section className="attendance-panel"><h2>Close check-in</h2><p>Close it early when attendance collection ends. Existing attendance records stay on members’ accounts.</p><form action={closeFormAction}><input type="hidden" name="eventId" value={eventId} />{(closed.status !== "success" || !open) && <FormMessage state={closed} />}<button className="attendance-button attendance-button-danger" type="submit" disabled={!open || pending || closing}>{closing ? "Closing…" : "Close check-in"}</button></form></section></div>
  </div>;
}

export function AdminAccessForm({ memberId, name, isAdmin, action }: { memberId: string; name: string; isAdmin: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-access-form"><input type="hidden" name="memberId" value={memberId} /><input type="hidden" name="operation" value={isAdmin ? "remove" : "promote"} /><label className="attendance-checkbox"><input type="checkbox" name="confirmed" required /> Confirm {isAdmin ? "removing admin access from" : "granting admin access to"} {name}</label><button type="submit" className={`attendance-button attendance-button-${isAdmin ? "danger" : "secondary"}`} disabled={pending}>{pending ? "Updating…" : isAdmin ? "Remove admin" : "Make admin"}</button><FormMessage state={state} /></form>;
}
