import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import "./ReviewModal.css";

const MAX_LENGTH = 1500;

function ReviewModal({ open, productTitle, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoverRating(0);
      setText("");
      setError("");
      setSubmitting(false);
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    firstFieldRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = text.trim();
  const canSubmit = rating >= 1 && rating <= 5 && trimmed.length > 0 && !submitting;
  const remaining = MAX_LENGTH - text.length;

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit?.({ rating, text: trimmed });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Could not submit review.";
      setError(message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  const activeRating = hoverRating || rating;
  const ratingLabels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  return (
    <div
      className="review-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <header className="review-modal-head">
          <div>
            <p className="review-modal-kicker">Share your experience</p>
            <h2 id="review-modal-title" className="review-modal-title">
              Write a review
            </h2>
            {productTitle ? (
              <p className="review-modal-subtitle">For {productTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="review-modal-close"
            onClick={onClose}
            aria-label="Close review form"
          >
            ×
          </button>
        </header>

        <form className="review-modal-form" onSubmit={handleSubmit} noValidate>
          <div className="review-modal-field">
            <label className="review-modal-label" htmlFor="review-modal-rating">
              Your rating
            </label>
            <div
              id="review-modal-rating"
              className="review-modal-stars"
              role="radiogroup"
              aria-label="Star rating"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = value <= activeRating;
                return (
                  <button
                    key={value}
                    ref={value === 1 ? firstFieldRef : null}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    className={`review-modal-star${filled ? " review-modal-star--filled" : ""}`}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onFocus={() => setHoverRating(value)}
                    onBlur={() => setHoverRating(0)}
                  >
                    <span aria-hidden="true">★</span>
                  </button>
                );
              })}
              <span className="review-modal-rating-label" aria-live="polite">
                {activeRating ? ratingLabels[activeRating] : "Tap to rate"}
              </span>
            </div>
          </div>

          <div className="review-modal-field">
            <label className="review-modal-label" htmlFor="review-modal-text">
              Your review
            </label>
            <textarea
              id="review-modal-text"
              className="review-modal-textarea"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
              placeholder="What did you love or wish were different about this product?"
              rows={5}
              required
            />
            <div className="review-modal-counter" aria-live="polite">
              {remaining} characters left
            </div>
          </div>

          {error ? <p className="review-modal-error">{error}</p> : null}

          <div className="review-modal-actions">
            <button
              type="button"
              className="review-modal-btn review-modal-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="review-modal-btn review-modal-btn--primary"
              disabled={!canSubmit}
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
