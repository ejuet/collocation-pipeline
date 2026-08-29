"""Small DistilBERT masked-word predictor."""

import torch
from transformers import AutoModelForMaskedLM, AutoTokenizer


MODEL_NAME = "distilbert-base-uncased"


class DistilBertPredictor:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForMaskedLM.from_pretrained(model_name).to(self.device).eval()

    def predict(self, masked_sentences: list[str], top_k: int = 5) -> list[list[dict]]:
        inputs = self.tokenizer(masked_sentences, padding=True, return_tensors="pt").to(self.device)
        mask_positions = (inputs.input_ids == self.tokenizer.mask_token_id).nonzero()

        with torch.inference_mode():
            probabilities = self.model(**inputs).logits.softmax(dim=-1)

        results = []
        for row, (_, position) in enumerate(mask_positions):
            scores, token_ids = probabilities[row, position].topk(top_k * 5)
            predictions = []
            for score, token_id in zip(scores, token_ids):
                word = self.tokenizer.convert_ids_to_tokens(token_id.item())
                if word.isalpha():
                    predictions.append({"word": word, "score": round(score.item(), 6)})
                if len(predictions) == top_k:
                    break
            results.append(predictions)
        return results

    def mask_gap(self, exercise: dict) -> str:
        sentence, gap = exercise["sentence"], exercise["gap"]
        return sentence[: gap["start"]] + self.tokenizer.mask_token + sentence[gap["end"] :]
