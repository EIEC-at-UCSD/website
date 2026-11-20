"use client";

import { useActionState, useEffect, useState } from "react";
import { initialFormState, type EventCode, type FormState } from "@/lib/attendance/types";
import { QrCodeCard } from "./qr-code-card";

type Action = (previous: FormState, form: FormData) => Promise<FormState>;

function FormMessage({ state }: { state: FormState }) {
  return state.message && (
    <div className={`attendance-notice attendance-notice-${state.status}`} role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </div>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// datetime-local input in the device's zone, submitted as a utc iso string
function LocalDateInput({ name, label, initial, required = true, hint }: {
  name: string; label: string; initial?: string | null; required?: boolean; hint?: string;
}) {
  const [value, setValue] = useState("");
  const [zone, setZone] = useState("your device’s local time");
  // set after mount so server and client render the same markup
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setValue(toLocalInput(initial));
  }, [initial]);
  const date = new Date(value);
  return <>
    <label htmlFor={`${name}-local`}>{label}</label>
    <input id={`${name}-local`} type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} required={required} />
    <input type="hidden" name={name} value={Number.isFinite(date.getTime()) ? date.toISOString() : ""} />
    <p className="attendance-hint">{hint ? `${hint} ` : ""}Entered in {zone}. Pages display Pacific time.</p>
  </>;
}

function EventFields({ title = "", location = "", points = 1, startsAt }: { title?: string; location?: string; points?: number; startsAt?: string }) {
  return <>
    <label htmlFor="event-title">Event name</label>
    <input id="event-title" name="title" placeholder="General Body Meeting" defaultValue={title} minLength={2} maxLength={120} required />
    <LocalDateInput name="startsAt" label="Event date and time" initial={startsAt} />
    <label htmlFor="event-location">Location (optional)</label>
    <input id="event-location" name="location" defaultValue={location} maxLength={160} />
    <label htmlFor="event-points">Points for attending</label>
    <input id="event-points" name="points" type="number" inputMode="numeric" min={0} max={1000} step={1} defaultValue={points} required />
  </>;
}

export function SignOutForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction}>
    <button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>
    <FormMessage state={state} />
  </form>;
}

export function ProfileForm({ name, action }: { name: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel">
    <h2>Your profile</h2>
    <form action={formAction}>
      <label htmlFor="profile-name">Your name</label>
      <input id="profile-name" name="name" autoComplete="name" defaultValue={name} required minLength={2} maxLength={80} />
      <p className="attendance-hint">The points board shows your first name and last initial.</p>
      <FormMessage state={state} />
      <button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>{pending ? "Saving…" : "Save name"}</button>
    </form>
  </section>;
}

export function BoardVisibilityForm({ visible, action }: { visible: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-inline-form">
    <input type="hidden" name="visible" value={String(!visible)} />
    <p className="attendance-hint">{visible ? "You appear on the members’ points board." : "You’re hidden from the points board."}</p>
    <button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>
      {pending ? "Saving…" : visible ? "Hide me from the board" : "Show me on the board"}
    </button>
    <FormMessage state={state} />
  </form>;
}

export function CreateEventForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel">
    <h2>Create an attendance event</h2>
    <p>Start with the event details. You’ll set up check-in and its QR code on the next screen.</p>
    <form action={formAction}>
      <EventFields />
      <FormMessage state={state} />
      <button className="attendance-button" type="submit" disabled={pending}>{pending ? "Creating…" : "Create event"}</button>
    </form>
  </section>;
}

export function EditEventForm({ event, action }: { event: { id: string; title: string; location: string; points: number; starts_at: string }; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel">
    <h2>Edit event</h2>
    <p>Changing the points affects future check-ins only. Existing records keep what they were given.</p>
    <form action={formAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <EventFields title={event.title} location={event.location} points={event.points} startsAt={event.starts_at} />
      <FormMessage state={state} />
      <button className="attendance-button attendance-button-secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save event"}</button>
    </form>
  </section>;
}

export function ArchiveEventForm({ eventId, archived, action }: { eventId: string; archived: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-inline-form">
    <input type="hidden" name="eventId" value={eventId} />
    <input type="hidden" name="archive" value={String(!archived)} />
    <button className={`attendance-button attendance-button-${archived ? "secondary" : "danger"}`} type="submit" disabled={pending}>
      {pending ? "Saving…" : archived ? "Restore event" : "Archive event"}
    </button>
    <FormMessage state={state} />
  </form>;
}

export function EventCodeControls({ eventId, title, current, archived, openAction, closeAction, extendAction }: {
  eventId: string; title: string; current: EventCode | null; archived: boolean; openAction: Action; closeAction: Action; extendAction: Action;
}) {
  const [extended, extendFormAction, extending] = useActionState(extendAction, initialFormState);
  const [state, openFormAction, pending] = useActionState(openAction, initialFormState);
  const [closed, closeFormAction, closing] = useActionState(closeAction, initialFormState);
  if (archived) {
    return <div className="attendance-notice">This event is archived. Restore it to open check-in again.</div>;
  }
  return <div className="attendance-section">
    {current && <QrCodeCard {...current} eventTitle={title} />}
    <div className="attendance-grid attendance-section">
      <section className="attendance-panel">
        <h2>{current ? "Replace the event code" : "Set up check-in"}</h2>
        <p>
          Leave the opening time blank to open check-in right away, or set one to prepare the QR for your slides ahead of the meeting.
          {current ? " A new code replaces the current one, so update any slide that shows it." : ""}
        </p>
        <form action={openFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <LocalDateInput name="opensAt" label="Check-in opens (optional)" required={false} hint="Blank opens it now." />
          <LocalDateInput name="closesAt" label="Check-in closes" />
          {current && <>
            <input type="hidden" name="replacing" value="true" />
            <label className="attendance-checkbox"><input type="checkbox" name="confirmed" required /> I understand the current code and QR will stop working</label>
          </>}
          <FormMessage state={state} />
          <button className="attendance-button" type="submit" disabled={pending || closing}>
            {pending ? "Generating…" : current ? "Generate replacement code" : "Generate code and QR"}
          </button>
        </form>
      </section>
      <section className="attendance-panel">
        {current && <>
          <h2>Change the closing time</h2>
          <p>Running long? Move the closing time. The code and QR stay the same.</p>
          <form action={extendFormAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <LocalDateInput name="newClosesAt" label="New closing time" initial={current.closesAt} />
            <FormMessage state={extended} />
            <button className="attendance-button attendance-button-secondary" type="submit" disabled={extending || pending || closing}>{extending ? "Saving…" : "Save closing time"}</button>
          </form>
        </>}
        <h2 className={current ? "attendance-subhead" : undefined}>Close check-in</h2>
        <p>Close it early when attendance collection ends. Existing attendance records stay on members’ accounts.</p>
        <form action={closeFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <FormMessage state={closed} />
          <button className="attendance-button attendance-button-danger" type="submit" disabled={!current || pending || closing}>
            {closing ? "Closing…" : "Close check-in"}
          </button>
        </form>
      </section>
    </div>
  </div>;
}

export function AddAttendanceForm({ eventId, eventPoints, action }: { eventId: string; eventPoints: number; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [fields, setFields] = useState({ email: "", points: "", note: "" });
  // controlled, so a rejected submit keeps what the admin typed. cleared after a success
  useEffect(() => { if (state.status === "success") setFields({ email: "", points: "", note: "" }); }, [state]);
  const bind = (name: keyof typeof fields) => ({
    name, value: fields[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFields((current) => ({ ...current, [name]: event.target.value })),
  });
  return <section className="attendance-panel">
    <h2>Add someone by hand</h2>
    <p>For a member who forgot to check in, or for bonus points. They need an EIEC account first.</p>
    <form action={formAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label htmlFor="add-email">Member’s UCSD email</label>
      <input id="add-email" type="email" placeholder="member@ucsd.edu" maxLength={254} autoCapitalize="none" required {...bind("email")} />
      <label htmlFor="add-points">Points (optional)</label>
      <input id="add-points" type="number" inputMode="numeric" min={0} max={1000} step={1} placeholder={String(eventPoints)} {...bind("points")} />
      <p className="attendance-hint">Blank gives this event’s {eventPoints}. Enter another number for a bonus.</p>
      <label htmlFor="add-note">Note (optional)</label>
      <input id="add-note" maxLength={200} placeholder="Forgot phone" {...bind("note")} />
      <FormMessage state={state} />
      <button className="attendance-button attendance-button-secondary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add attendance"}</button>
    </form>
  </section>;
}

export function RemoveAttendanceForm({ eventId, memberId, name, action }: { eventId: string; memberId: string; name: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-access-form">
    <input type="hidden" name="eventId" value={eventId} />
    <input type="hidden" name="memberId" value={memberId} />
    <label className="attendance-checkbox"><input type="checkbox" name="confirmed" required /> Confirm removing {name}</label>
    <button type="submit" className="attendance-button attendance-button-danger" disabled={pending}>{pending ? "Removing…" : "Remove"}</button>
    <FormMessage state={state} />
  </form>;
}

export function BoardHiddenForm({ memberId, hidden, action }: { memberId: string; hidden: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-access-form">
    <input type="hidden" name="memberId" value={memberId} />
    <input type="hidden" name="hidden" value={String(!hidden)} />
    <button type="submit" className="attendance-button attendance-button-secondary" disabled={pending}>
      {pending ? "Saving…" : hidden ? "Show on points board" : "Hide from points board"}
    </button>
    <FormMessage state={state} />
  </form>;
}

export function SeasonForm({ seasonStart, action }: { seasonStart: string | null; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <section className="attendance-panel">
    <h2>Points board season</h2>
    <p>The points board counts events on or after this date. Move it forward to start a new school year. Nothing is deleted.</p>
    <form action={formAction}>
      <LocalDateInput name="seasonStart" label="Count events from" initial={seasonStart} required={false} hint="Blank counts every event." />
      <FormMessage state={state} />
      <button className="attendance-button attendance-button-secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save season"}</button>
    </form>
  </section>;
}

export function AdminAccessForm({ memberId, name, isAdmin, action }: { memberId: string; name: string; isAdmin: boolean; action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return <form action={formAction} className="attendance-access-form">
    <input type="hidden" name="memberId" value={memberId} />
    <input type="hidden" name="operation" value={isAdmin ? "remove" : "promote"} />
    <label className="attendance-checkbox">
      <input type="checkbox" name="confirmed" required /> Confirm {isAdmin ? "removing admin access from" : "granting admin access to"} {name}
    </label>
    <button type="submit" className={`attendance-button attendance-button-${isAdmin ? "danger" : "secondary"}`} disabled={pending}>
      {pending ? "Updating…" : isAdmin ? "Remove admin" : "Make admin"}
    </button>
    <FormMessage state={state} />
  </form>;
}
