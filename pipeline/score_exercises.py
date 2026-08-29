"""Create language-model scores for exercise JSONL records."""

import argparse
import json
from pathlib import Path

from tqdm import tqdm

from distilbert import DistilBertPredictor
from t5 import T5Predictor


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "input", nargs="?", type=Path, default=Path("data/exercises.jsonl")
    )
    parser.add_argument(
        "output", nargs="?", type=Path, default=Path("data/scores.jsonl")
    )
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--predictor", choices=("distilbert", "t5"), default="t5")
    args = parser.parse_args()

    with args.input.open() as source:
        exercises = [json.loads(line) for line in source]

    predictor = T5Predictor() if args.predictor == "t5" else DistilBertPredictor()
    with args.output.open("w") as output:
        batches = range(0, len(exercises), args.batch_size)
        for start in tqdm(batches, desc="Scoring exercises", unit="batch"):
            batch = exercises[start : start + args.batch_size]
            predictions = predictor.predict(
                [predictor.mask_gap(exercise) for exercise in batch], args.top_k
            )
            for exercise, words in zip(batch, predictions):
                score = {
                    "exercise_id": exercise["id"],
                    "model": predictor.model_name,
                    "scoring": {
                        "predictions": words,
                    },
                }
                output.write(json.dumps(score, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
