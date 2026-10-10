"""Report ranking metrics for masked-language-model exercise scores.

In addition to exact top-1 accuracy, this distinguishes answers that appear
lower in the returned suggestions from answers the model did not suggest at
all. That is useful for the quiz: the former are plausible alternatives, while
the latter are not supported by the model's candidate list.
"""

import argparse
import json
from collections import Counter
from pathlib import Path


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open()]


def percentage(value: int, total: int) -> str:
    return f"{value / total:.1%} ({value}/{total})"


def accepted_rank(accepted: set[str], predictions: list[dict]) -> int | None:
    """Return the best one-based rank of any accepted prediction."""
    for rank, prediction in enumerate(predictions, start=1):
        if prediction["word"].casefold() in accepted:
            return rank
    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Report top-k coverage and accepted-answer ranks."
    )
    parser.add_argument(
        "exercises", nargs="?", type=Path, default=Path("data/exercises.jsonl")
    )
    parser.add_argument("scores", nargs="?", type=Path, default=Path("data/scores.jsonl"))
    parser.add_argument(
        "--k",
        type=int,
        default=5,
        help="Number of suggestions considered for top-k metrics (default: 5).",
    )
    parser.add_argument(
        "--examples",
        action="store_true",
        help="Print exercises whose accepted answer appears below rank one.",
    )
    args = parser.parse_args()
    if args.k < 1:
        parser.error("--k must be at least 1")

    exercises = {row["id"]: row for row in read_jsonl(args.exercises)}
    scores = read_jsonl(args.scores)
    if not scores:
        parser.error("scores must contain at least one record")

    rank_counts: Counter[int] = Counter()
    missing = 0
    returned_counts: list[int] = []
    reciprocal_rank_sum = 0.0
    examples: list[tuple[dict, int, list[dict]]] = []

    for score in scores:
        exercise = exercises[score["exercise_id"]]
        accepted = {word.casefold() for word in exercise["gap"]["accepted"]}
        predictions = score["scoring"]["predictions"][: args.k]
        returned_counts.append(len(predictions))
        rank = accepted_rank(accepted, predictions)

        if rank is None:
            missing += 1
            continue

        rank_counts[rank] += 1
        reciprocal_rank_sum += 1 / rank
        if args.examples and rank > 1:
            examples.append((exercise, rank, predictions))

    total = len(scores)
    top_1 = rank_counts[1]
    top_k = total - missing
    lower_rank = top_k - top_1
    max_returned = max(returned_counts)
    average_returned = sum(returned_counts) / total

    print(f"Exercises: {total}")
    print(f"Suggestions considered: first {args.k} (mean returned: {average_returned:.1f})")
    print(f"Top-1 accuracy: {percentage(top_1, total)}")
    print(f"Accepted answer among considered suggestions: {percentage(top_k, total)}")
    print(f"Accepted answer only below rank 1: {percentage(lower_rank, total)}")
    print(f"Accepted answer absent from considered suggestions: {percentage(missing, total)}")
    print(f"Mean reciprocal rank (within first {args.k}): {reciprocal_rank_sum / total:.3f}")
    print("Accepted-answer rank distribution:")
    for rank in range(1, max_returned + 1):
        print(f"  {rank}: {percentage(rank_counts[rank], total)}")
    print(f"  not in first {args.k}: {percentage(missing, total)}")

    if args.examples:
        print("\nAccepted answers below rank 1:")
        for exercise, rank, predictions in examples:
            words = ", ".join(prediction["word"] for prediction in predictions)
            accepted = ", ".join(exercise["gap"]["accepted"])
            print(f"  rank {rank}: {exercise['sentence']} | accepted: {accepted} | suggestions: {words}")


if __name__ == "__main__":
    main()
