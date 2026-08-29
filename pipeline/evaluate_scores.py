"""Print incorrect top predictions and overall accepted top-1 accuracy."""

import argparse
import json
from pathlib import Path


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.open()]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "exercises", nargs="?", type=Path, default=Path("data/exercises.jsonl")
    )
    parser.add_argument("scores", nargs="?", type=Path, default=Path("data/scores.jsonl"))
    args = parser.parse_args()

    exercises = {row["id"]: row for row in read_jsonl(args.exercises)}
    scores = read_jsonl(args.scores)
    correct = 0

    for score in scores:
        exercise = exercises[score["exercise_id"]]
        accepted = exercise["gap"]["accepted"]
        accepted_casefolded = {answer.casefold() for answer in accepted}
        predictions = score["scoring"]["predictions"]
        predicted = predictions[0]["word"] if predictions else ""
        if predicted.casefold() in accepted_casefolded:
            correct += 1
        else:
            print(
                f'{exercise["sentence"]} | accepted: {", ".join(accepted)}'
                f' | predicted: {predicted or "<none>"}'
            )

    print(f"Top-1 accuracy: {correct / len(scores):.1%} ({correct}/{len(scores)})")


if __name__ == "__main__":
    main()
