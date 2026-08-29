"""German BERT masked-language-model predictor."""

from bert_large_wwm import BertLargeWwmPredictor


MODEL_NAME = "dbmdz/bert-base-german-cased"


class GermanBertPredictor(BertLargeWwmPredictor):
    """Predict German gap fills using a BERT model pretrained on German text."""

    def __init__(self, model_name: str = MODEL_NAME):
        super().__init__(model_name)
