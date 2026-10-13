import { useEffect, useState } from 'react';
import { reviewService } from '../../../services/api';
import './ReviewsTab.css';

const formatEventDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ReviewsTab() {
  const [events, setEvents] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingEventId, setSavingEventId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    reviewService.getCheckedInEvents()
      .then(({ data }) => {
        if (isMounted) {
          setEvents(Array.isArray(data) ? data : []);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'We could not load your checked-in events. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const submitReview = async (event) => {
    event.preventDefault();
    const eventId = event.currentTarget.dataset.eventId;
    const rating = ratings[eventId];
    if (!rating) {
      setError('Choose a star rating before submitting your review.');
      return;
    }

    setSavingEventId(eventId);
    setError('');
    setSuccessMessage('');

    try {
      await reviewService.create({
        eventId: Number(eventId),
        rating,
        comment: comments[eventId] || ''
      });
      setEvents(currentEvents => currentEvents.map(item =>
        String(item.eventId) === eventId
          ? {
            ...item,
            review: {
              rating,
              comment: (comments[eventId] || '').trim(),
              createdAt: new Date().toISOString()
            }
          }
          : item
      ));
      setSuccessMessage('Thanks for sharing your feedback.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your review could not be submitted. Please try again.');
    } finally {
      setSavingEventId(null);
    }
  };

  if (loading) {
    return (
      <section className="reviews-page" aria-live="polite">
        <div className="reviews-loading"><span className="reviews-spinner" />Loading your attended events...</div>
      </section>
    );
  }

  return (
    <section className="reviews-page">
      <div className="reviews-heading">
        <div>
          <span className="reviews-eyebrow">YOUR VOICE MATTERS</span>
          <h3>Ratings &amp; reviews</h3>
          <p>Share your experience and help us make every event better.</p>
        </div>
        <div className="reviews-count" aria-label={`${events.length} checked-in events`}>
          <span>{events.length}</span>
          <small>ATTENDED</small>
        </div>
      </div>

      {error && <div className="reviews-alert reviews-alert-error" role="alert">{error}</div>}
      {successMessage && <div className="reviews-alert reviews-alert-success" role="status">{successMessage}</div>}

      {events.length === 0 ? (
        <div className="reviews-empty">
          <div className="reviews-empty-icon" aria-hidden="true">★</div>
          <h4>Your event stories start here</h4>
          <p>Once you check in to an event, you can rate it and leave feedback here.</p>
        </div>
      ) : (
        <div className="reviews-list">
          {events.map((event) => {
            const eventId = String(event.eventId);
            const review = event.review;
            return (
              <article className="review-card" key={eventId}>
                <div className="review-card-top">
                  <div className="review-event-icon" aria-hidden="true">✦</div>
                  <div className="review-event-info">
                    <span className="review-event-kicker">ATTENDED EVENT</span>
                    <h4>{event.eventName}</h4>
                    <div className="review-event-meta">
                      <span>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <rect x="3.25" y="4.5" width="13.5" height="12" rx="2" />
                          <path d="M6.5 2.75v3.5M13.5 2.75v3.5M3.5 8h13" />
                        </svg>
                        {formatEventDate(event.eventDate)}
                      </span>
                      <span>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M16 8.25c0 4.25-6 9-6 9s-6-4.75-6-9a6 6 0 1 1 12 0Z" />
                          <circle cx="10" cy="8" r="2" />
                        </svg>
                        {event.location || 'Location unavailable'}
                      </span>
                    </div>
                  </div>
                  <span className={`review-status ${review ? 'review-status-done' : ''}`}>
                    {review ? 'REVIEWED' : 'FEEDBACK OPEN'}
                  </span>
                </div>

                {review ? (
                  <div className="review-submitted">
                    <div className="review-submitted-rating" aria-label={`${review.rating} out of 5 stars`}>
                      {'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span>
                      <strong>{review.rating}.0</strong>
                    </div>
                    {review.comment && <p className="review-submitted-comment">“{review.comment}”</p>}
                    <span className="review-thank-you">Thank you for sharing your feedback.</span>
                  </div>
                ) : (
                  <form className="review-form" data-event-id={eventId} onSubmit={submitReview}>
                    <fieldset className="rating-field">
                      <legend>How would you rate this event?</legend>
                      <div className="rating-options">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            className={`rating-star ${ratings[eventId] >= rating ? 'selected' : ''}`}
                            type="button"
                            key={rating}
                            aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                            aria-pressed={ratings[eventId] === rating}
                            disabled={savingEventId === eventId}
                            onClick={() => setRatings(current => ({ ...current, [eventId]: rating }))}
                          >
                            ★
                          </button>
                        ))}
                        <span className="rating-hint">{ratings[eventId] ? `${ratings[eventId]} out of 5` : 'Select a rating'}</span>
                      </div>
                    </fieldset>

                    <label className="review-comment-label" htmlFor={`review-comment-${eventId}`}>
                      Your comments <span>Optional</span>
                    </label>
                    <textarea
                      id={`review-comment-${eventId}`}
                      className="review-comment"
                      rows="3"
                      maxLength="1000"
                      placeholder="What did you enjoy? What could we improve?"
                      value={comments[eventId] || ''}
                      disabled={savingEventId === eventId}
                      onChange={(changeEvent) => setComments(current => ({ ...current, [eventId]: changeEvent.target.value }))}
                    />
                    <div className="review-form-footer">
                      <span>{(comments[eventId] || '').length}/1000</span>
                      <button className="review-submit" type="submit" disabled={savingEventId === eventId || !ratings[eventId]}>
                        {savingEventId === eventId ? 'Submitting...' : 'Submit review'}
                        {savingEventId !== eventId && <span aria-hidden="true">→</span>}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
