'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { buttonClasses } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/states';
import { useAuth } from '@/lib/auth/store';
import { cn } from '@/lib/cn';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { Rating } from './bits';

type Review = { id: string; rating: number; body: string | null; created_at: string; updated_at: string; reviewer: string; is_mine: boolean };

export const MAX_REVIEW_LENGTH = 4000;

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Choose a star rating.').max(5),
  body: z
    .string()
    .trim()
    .max(MAX_REVIEW_LENGTH, `Keep your review under ${MAX_REVIEW_LENGTH.toLocaleString('en')} characters.`),
});

/** Reader reviews live in our own database; they are separate from the ratings the book APIs report. */
export function Reviews({ bookId, title }: { bookId: string; title: string }) {
  const { enabled, status, user } = useAuth();
  const pathname = usePathname();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [summary, setSummary] = useState<{ average: number | null; total: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setLoadError(false);
    const [list, rating] = await Promise.all([
      supabase.rpc('get_book_reviews', { p_book_id: bookId, p_limit: 20 }),
      supabase.rpc('get_book_rating', { p_book_id: bookId }),
    ]);
    if (list.error || rating.error) {
      setLoadError(true);
      setReviews([]);
      return;
    }
    setReviews(list.data ?? []);
    const r = rating.data?.[0];
    setSummary(r ? { average: r.average === null ? null : Number(r.average), total: Number(r.total) } : null);
  }, [bookId]);

  useEffect(() => {
    if (status === 'loading' || !enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and when the viewer signs in/out
    void load();
  }, [load, status, enabled, user?.id]);

  if (!enabled) return null;

  const mine = reviews?.find((r) => r.is_mine);
  const others = reviews?.filter((r) => !r.is_mine) ?? [];

  return (
    <section aria-labelledby="reviews-heading" className="mt-20 max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="reviews-heading" className="text-h3 font-semibold">
          Reader reviews
        </h2>
        {summary && summary.total > 0 && summary.average !== null && (
          <Rating value={summary.average} count={summary.total} className="text-ui" />
        )}
      </div>
      <p className="mt-1 text-caption text-ink-muted">Written by readers who use this catalog.</p>

      <div className="mt-6">
        {status === 'guest' && (
          <p className="rounded-xs border border-rule bg-paper-raised px-4 py-3 text-ui text-ink-muted">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link> to rate and review {title}.
          </p>
        )}
        {status === 'authenticated' && reviews !== null && (!mine || editing) && (
          <ReviewForm
            bookId={bookId}
            existing={mine}
            onSaved={() => {
              setEditing(false);
              void load();
            }}
            onCancel={mine ? () => setEditing(false) : undefined}
          />
        )}
      </div>

      {reviews === null ? (
        <div role="status" className="mt-6 space-y-4" aria-busy="true" aria-label="Loading reviews">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : loadError ? (
        <p role="alert" className="mt-6 text-ui text-ink-muted">
          Reviews couldn’t be loaded.{' '}
          <button type="button" onClick={() => void load()} className="font-semibold text-forest underline">
            Try again
          </button>
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-t border-rule">
          {mine && !editing && (
            <ReviewItem review={mine} onEdit={() => setEditing(true)} onDeleted={() => void load()} />
          )}
          {others.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
          {!mine && others.length === 0 && (
            <li className="py-6 text-ui text-ink-muted">No reviews yet. Be the first to share what you thought.</li>
          )}
        </ul>
      )}
    </section>
  );
}

function ReviewItem({ review, onEdit, onDeleted }: { review: Review; onEdit?: () => void; onDeleted?: () => void }) {
  const [busy, setBusy] = useState(false);
  const date = new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  async function remove() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    setBusy(false);
    if (error) toast.error('Your review couldn’t be deleted. Try again.');
    else {
      toast('Review deleted');
      onDeleted?.();
    }
  }
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-ink">{review.is_mine ? 'Your review' : review.reviewer}</span>
        <Rating value={review.rating} />
        <time dateTime={review.created_at} className="text-caption text-ink-muted">
          {date}
        </time>
      </div>
      {review.body && (
        <p dir="auto" className="mt-2 max-w-[68ch] text-body whitespace-pre-line break-words text-ink">
          {review.body}
        </p>
      )}
      {review.is_mine && (
        <div className="mt-3 flex gap-2">
          <button type="button" className={buttonClasses('secondary', 'sm')} onClick={onEdit}>
            Edit review
          </button>
          <button type="button" className={buttonClasses('quiet', 'sm', 'text-danger')} onClick={remove} disabled={busy}>
            Delete review
          </button>
        </div>
      )}
    </li>
  );
}

function ReviewForm({
  bookId,
  existing,
  onSaved,
  onCancel,
}: {
  bookId: string;
  existing?: Review;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const user = useAuth((s) => s.user);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ rating, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your review and try again.');
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase || !user) return;
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase
      .from('reviews')
      .upsert(
        { user_id: user.id, book_id: bookId, rating: parsed.data.rating, body: parsed.data.body || null },
        { onConflict: 'user_id,book_id' },
      );
    setSaving(false);
    if (dbError) {
      setError('Your review couldn’t be saved. Check your connection and try again.');
      return;
    }
    toast.success(existing ? 'Review updated' : 'Review posted');
    onSaved();
  }

  const shown = hover || rating;
  const remaining = MAX_REVIEW_LENGTH - body.length;

  return (
    <form onSubmit={submit} className="rounded-xs border border-rule bg-paper-raised p-4 sm:p-5" noValidate>
      <fieldset>
        <legend className="text-ui font-semibold text-ink">{existing ? 'Edit your rating' : 'Your rating'}</legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-xs p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest/50" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={`${id}-rating`}
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? 'star' : 'stars'}
              </span>
              <Star
                aria-hidden
                className={cn('size-7', n <= shown ? 'fill-brass text-brass' : 'text-brass/50')}
                strokeWidth={1.5}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-body`} className="mt-4 block text-ui font-semibold text-ink">
        Review <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <textarea
        id={`${id}-body`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={MAX_REVIEW_LENGTH}
        dir="auto"
        aria-describedby={`${id}-count`}
        className="mt-1.5 w-full rounded-sm border border-rule-strong bg-paper px-3 py-2 text-body text-ink focus:border-forest focus:outline-none"
        placeholder="What did you think?"
      />
      <p id={`${id}-count`} className={cn('mt-1 text-caption', remaining < 200 ? 'text-danger' : 'text-ink-muted')}>
        {remaining.toLocaleString('en')} characters left
      </p>
      {error && (
        <p role="alert" className="mt-2 text-ui text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button type="submit" className={buttonClasses('primary', 'md')} disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Save review' : 'Post review'}
        </button>
        {onCancel && (
          <button type="button" className={buttonClasses('quiet', 'md')} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
