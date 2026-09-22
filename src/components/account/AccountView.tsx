'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { UserIdentity } from '@supabase/supabase-js';
import { Download, KeyRound, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { fieldClass, labelClass } from '@/components/auth/AuthCard';
import { buttonClasses } from '@/components/ui/button';
import { authErrorMessage } from '@/lib/auth/redirect';
import { signOutEverywhere } from '@/lib/auth/signOut';
import { useAuth } from '@/lib/auth/store';
import { getBrowserSupabase } from '@/lib/supabase/client';

type Props = { email?: string; initialName: string; initialShowMature: boolean };

function Section({ title, description, children, tone }: { title: string; description?: string; children: ReactNode; tone?: 'danger' }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-rule py-8 md:grid-cols-[260px_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 id={id} className={`font-sans text-body font-semibold tracking-normal ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}>
          {title}
        </h2>
        {description && <p className="mt-1 text-ui text-ink-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-lg">{children}</div>
    </section>
  );
}

export function AccountView({ email, initialName, initialShowMature }: Props) {
  const router = useRouter();
  const setAuth = useAuth((s) => s.set);
  const user = useAuth((s) => s.user);
  const id = useId();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showMature, setShowMature] = useState(initialShowMature);
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase?.auth.getUserIdentities().then(({ data }) => setIdentities(data?.identities ?? []));
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) {
      setNameError('Use between 1 and 60 characters.');
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return;
    setSavingName(true);
    setNameError(null);
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
    setSavingName(false);
    if (error) {
      setNameError('Your name couldn’t be saved. Try again.');
      return;
    }
    setAuth({ user: { ...user, name: trimmed } });
    toast.success('Name saved');
  }

  async function toggleMature(next: boolean) {
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return;
    setShowMature(next);
    const { error } = await supabase.from('profiles').update({ show_mature: next }).eq('id', user.id);
    if (error) {
      setShowMature(!next);
      toast.error('That setting couldn’t be saved. Try again.');
      return;
    }
    setAuth({ user: { ...user, showMature: next } });
  }

  async function exportData() {
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return;
    const [shelf, reviews, profile] = await Promise.all([
      supabase.from('shelf_items').select('book_id, status, progress, book, added_at, updated_at').eq('user_id', user.id),
      supabase.from('reviews').select('book_id, rating, body, created_at, updated_at').eq('user_id', user.id),
      supabase.from('profiles').select('display_name, show_mature, created_at').eq('id', user.id).maybeSingle(),
    ]);
    if (shelf.error || reviews.error || profile.error) {
      toast.error('Your data couldn’t be exported. Try again.');
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), email, profile: profile.data, shelf: shelf.data, reviews: reviews.data }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bibliotheca-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const hasGoogle = identities?.some((i) => i.provider === 'google');
  const hasEmail = identities?.some((i) => i.provider === 'email');

  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-8 sm:px-6 sm:pt-12">
      <h1 className="text-h2 font-semibold">Account</h1>
      <p className="mt-2 text-ui text-ink-muted">
        Signed in as <span className="font-semibold text-ink">{email}</span>
      </p>

      <div className="mt-8">
        <Section title="Your name" description="Shown next to reviews you write.">
          <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
            <div className="flex-1">
              <label htmlFor={`${id}-name`} className={labelClass}>
                Display name
              </label>
              <input
                id={`${id}-name`}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? `${id}-name-err` : undefined}
                className={fieldClass}
              />
            </div>
            <button type="submit" disabled={savingName} className={buttonClasses('primary', 'lg')}>
              {savingName ? 'Saving…' : 'Save name'}
            </button>
          </form>
          {nameError && (
            <p id={`${id}-name-err`} className="mt-2 text-caption text-danger">
              {nameError}
            </p>
          )}
        </Section>

        <Section title="Mature content" description="Covers of books marked for mature readers are blurred until you choose to see them.">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--forest)]" checked={showMature} onChange={(e) => toggleMature(e.target.checked)} />
            <span className="text-ui text-ink">
              Show mature covers without blurring
              <span className="block text-caption text-ink-muted">You confirm you’re an adult.</span>
            </span>
          </label>
        </Section>

        <Section title="Sign-in methods" description="Ways you can sign in to this account.">
          {identities === null ? (
            <p className="text-ui text-ink-muted">Loading…</p>
          ) : (
            <ul className="divide-y divide-rule rounded-xs border border-rule bg-paper-raised">
              <li className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 text-ui text-ink">
                  <KeyRound aria-hidden className="size-4 text-ink-muted" /> Email and password
                </span>
                {hasEmail ? (
                  <Link href="/forgot-password" className="text-caption font-semibold text-forest">
                    Change password
                  </Link>
                ) : (
                  <span className="text-caption text-ink-muted">Not set up</span>
                )}
              </li>
              <li className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-ui text-ink">Google</span>
                {hasGoogle ? (
                  <button
                    type="button"
                    className="text-caption font-semibold text-forest disabled:text-ink-muted"
                    disabled={identities.length < 2}
                    title={identities.length < 2 ? 'Add another way to sign in before disconnecting Google.' : undefined}
                    onClick={async () => {
                      const supabase = getBrowserSupabase();
                      const g = identities.find((i) => i.provider === 'google');
                      if (!supabase || !g) return;
                      const { error } = await supabase.auth.unlinkIdentity(g);
                      if (error) toast.error(authErrorMessage(error));
                      else {
                        setIdentities(identities.filter((i) => i !== g));
                        toast.success('Google disconnected');
                      }
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-caption font-semibold text-forest"
                    onClick={async () => {
                      const supabase = getBrowserSupabase();
                      if (!supabase) return;
                      const { error } = await supabase.auth.linkIdentity({
                        provider: 'google',
                        options: { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
                      });
                      if (error) toast.error(authErrorMessage(error));
                    }}
                  >
                    Connect
                  </button>
                )}
              </li>
            </ul>
          )}
        </Section>

        <Section title="Your data" description="Download your shelf, reviews and profile as a JSON file.">
          <button type="button" className={buttonClasses('secondary', 'lg')} onClick={exportData}>
            <Download aria-hidden className="size-4" /> Download my data
          </button>
        </Section>

        <Section title="Delete account" description="Permanently deletes your account, shelf, reading progress and reviews." tone="danger">
          <DeleteAccount
            onExport={exportData}
            onDeleted={async () => {
              await signOutEverywhere();
              toast.success('Your account and all its data were deleted.');
              router.replace('/');
              router.refresh();
            }}
          />
        </Section>
      </div>
    </div>
  );
}

function DeleteAccount({ onExport, onDeleted }: { onExport: () => void; onDeleted: () => Promise<void> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirm.trim().toUpperCase() === 'DELETE';

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setConfirm('');
          setError(null);
        }
      }}
    >
      <Dialog.Trigger className={buttonClasses('danger', 'lg')}>Delete my account</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border border-rule bg-paper-raised p-6 shadow-2xl data-[state=open]:animate-fade-in">
          <TriangleAlert aria-hidden className="size-7 text-danger" strokeWidth={1.6} />
          <Dialog.Title className="mt-3 font-display text-h3 font-semibold text-ink">Delete your account?</Dialog.Title>
          <Dialog.Description className="mt-2 text-ui text-ink-muted">
            Your shelf, reading progress and reviews will be deleted for good. This can’t be undone.{' '}
            <button type="button" onClick={onExport} className="font-semibold text-forest underline">
              Download your data first
            </button>
            .
          </Dialog.Description>
          <form
            className="mt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ready) return;
              const supabase = getBrowserSupabase();
              if (!supabase) return;
              setBusy(true);
              setError(null);
              const { error: err } = await supabase.rpc('delete_my_account');
              if (err) {
                setBusy(false);
                setError('Your account couldn’t be deleted. Try again, or contact the library.');
                return;
              }
              await onDeleted();
            }}
          >
            <label htmlFor={`${id}-confirm`} className={labelClass}>
              Type DELETE to confirm
            </label>
            <input id={`${id}-confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className={fieldClass} />
            {error && (
              <p role="alert" className="mt-2 text-ui text-danger">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className={buttonClasses('quiet', 'md')}>Cancel</Dialog.Close>
              <button type="submit" disabled={!ready || busy} className={buttonClasses('danger', 'md')}>
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
