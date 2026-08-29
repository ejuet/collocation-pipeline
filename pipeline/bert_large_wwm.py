"""BERT-large whole-word-masking predictor."""

import torch
from transformers import AutoModelForMaskedLM, AutoTokenizer


MODEL_NAME = "google-bert/bert-large-uncased-whole-word-masking"


class BertLargeWwmPredictor:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForMaskedLM.from_pretrained(model_name).to(self.device).eval()

    def predict(self, masked_sentences: list[str], top_k: int = 5) -> list[list[dict]]:
        inputs = self.tokenizer(masked_sentences, padding=True, return_tensors="pt").to(
            self.device
        )
        mask_locations = inputs.input_ids == self.tokenizer.mask_token_id
        masks_per_sentence = mask_locations.sum(dim=1)
        if not torch.all(masks_per_sentence == 1):
            raise ValueError("Each sentence must contain exactly one mask token")

        with torch.inference_mode():
            probabilities = self.model(**inputs).logits.softmax(dim=-1)

        results = []
        for row in range(len(masked_sentences)):
            position = mask_locations[row].nonzero(as_tuple=True)[0].item()
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
