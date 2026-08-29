"""Instruction-based FLAN-T5 gap predictor."""

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


MODEL_NAME = "google/flan-t5-base"
GAP_MARKER = "<blank>"
PROMPT = (
    "Fill in <blank> with exactly one word. Return only the missing word.\n"
    "Sentence: {sentence}"
)


class FlanT5Predictor:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device).eval()

    def predict(self, prompts: list[str], top_k: int = 5) -> list[list[dict]]:
        inputs = self.tokenizer(prompts, padding=True, return_tensors="pt").to(self.device)

        with torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                num_beams=max(top_k, 2),
                num_return_sequences=top_k,
                max_new_tokens=8,
                early_stopping=True,
                length_penalty=0.0,
                return_dict_in_generate=True,
                output_scores=True,
            )

        decoded = self.tokenizer.batch_decode(
            generated.sequences, skip_special_tokens=True
        )
        sequence_scores = generated.sequences_scores.tolist()
        results = []
        for row in range(len(prompts)):
            predictions = []
            start = row * top_k
            for word, score in zip(
                decoded[start : start + top_k],
                sequence_scores[start : start + top_k],
            ):
                word = word.strip()
                if word and word not in {prediction["word"] for prediction in predictions}:
                    predictions.append({"word": word, "score": round(score, 6)})
            results.append(predictions)
        return results

    def mask_gap(self, exercise: dict) -> str:
        sentence, gap = exercise["sentence"], exercise["gap"]
        sentence = sentence[: gap["start"]] + GAP_MARKER + sentence[gap["end"] :]
        return PROMPT.format(sentence=sentence)
