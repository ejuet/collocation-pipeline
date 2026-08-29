"""Small T5 span-infilling predictor."""

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


MODEL_NAME = "google-t5/t5-small"
START_SENTINEL = "<extra_id_0>"
END_SENTINEL = "<extra_id_1>"


class T5Predictor:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device).eval()

    def predict(self, masked_sentences: list[str], top_k: int = 5) -> list[list[dict]]:
        inputs = self.tokenizer(masked_sentences, padding=True, return_tensors="pt").to(
            self.device
        )
        num_beams = max(top_k, 2)
        start_sentinel_id = self.tokenizer.convert_tokens_to_ids(START_SENTINEL)
        end_sentinel_id = self.tokenizer.convert_tokens_to_ids(END_SENTINEL)
        decoder_input_ids = torch.tensor(
            [[self.model.config.decoder_start_token_id, start_sentinel_id]],
            device=self.device,
        ).repeat(len(masked_sentences), 1)

        with torch.inference_mode():
            generated = self.model.generate(
                **inputs,
                decoder_input_ids=decoder_input_ids,
                num_beams=num_beams,
                num_return_sequences=top_k,
                max_new_tokens=8,
                early_stopping=True,
                eos_token_id=end_sentinel_id,
                forced_eos_token_id=end_sentinel_id,
                length_penalty=0.0,
                return_dict_in_generate=True,
                output_scores=True,
            )

        decoded = self.tokenizer.batch_decode(
            generated.sequences, skip_special_tokens=False
        )
        sequence_scores = generated.sequences_scores.tolist()
        results = []
        for row in range(len(masked_sentences)):
            predictions = []
            start = row * top_k
            for text, score in zip(
                decoded[start : start + top_k],
                sequence_scores[start : start + top_k],
            ):
                word = self._extract_span(text)
                if word and word not in {prediction["word"] for prediction in predictions}:
                    predictions.append({"word": word, "score": round(score, 6)})
            results.append(predictions)
        return results

    def mask_gap(self, exercise: dict) -> str:
        sentence, gap = exercise["sentence"], exercise["gap"]
        return sentence[: gap["start"]] + START_SENTINEL + sentence[gap["end"] :]

    @staticmethod
    def _extract_span(text: str) -> str:
        if START_SENTINEL not in text:
            return ""
        span = text.split(START_SENTINEL, 1)[1]
        span = span.split(END_SENTINEL, 1)[0]
        return span.replace("</s>", "").replace("<pad>", "").strip()
