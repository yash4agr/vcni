import modal
import torch
import torch.nn as nn
from transformers import XLMRobertaPreTrainedModel, XLMRobertaModel, AutoTokenizer
from transformers.modeling_outputs import ModelOutput
from dataclasses import dataclass
from typing import Optional, Tuple
import json
import os
from pydantic import BaseModel

# ==============================================================================
# 1. CONFIGURATION & CONSTANTS
# ==============================================================================

_INTENTS = [
    'datetime_query', 'iot_hue_lightchange', 'transport_ticket', 'takeaway_query', 'qa_stock',
    'general_greet', 'recommendation_events', 'music_dislikeness', 'iot_wemo_off', 'cooking_recipe',
    'qa_currency', 'transport_traffic', 'general_quirky', 'weather_query', 'audio_volume_up',
    'email_addcontact', 'takeaway_order', 'email_querycontact', 'iot_hue_lightup',
    'recommendation_locations', 'play_audiobook', 'lists_createoradd', 'news_query',
    'alarm_query', 'iot_wemo_on', 'general_joke', 'qa_definition', 'social_query',
    'music_settings', 'audio_volume_other', 'calendar_remove', 'iot_hue_lightdim',
    'calendar_query', 'email_sendemail', 'iot_cleaning', 'audio_volume_down',
    'play_radio', 'cooking_query', 'datetime_convert', 'qa_maths', 'iot_hue_lightoff',
    'iot_hue_lighton', 'transport_query', 'music_likeness', 'email_query', 'play_music',
    'audio_volume_mute', 'social_post', 'alarm_set', 'qa_factoid', 'calendar_set',
    'play_game', 'alarm_remove', 'lists_remove', 'transport_taxi', 'recommendation_movies',
    'iot_coffee', 'music_query', 'play_podcasts', 'lists_query'
]

REMOTE_MODEL_DIR = "/model/joint_nlu_model_sota"

# ==============================================================================
# 2. MODEL DEFINITION
# ==============================================================================

@dataclass
class JointNLUOutput(ModelOutput):
    loss: Optional[torch.FloatTensor] = None
    intent_loss: Optional[torch.FloatTensor] = None
    slot_loss: Optional[torch.FloatTensor] = None
    intent_logits: torch.FloatTensor = None
    slot_logits: torch.FloatTensor = None
    hidden_states: Optional[Tuple[torch.FloatTensor]] = None
    attentions: Optional[Tuple[torch.FloatTensor]] = None

class XLMRobertaForJointNLU(XLMRobertaPreTrainedModel):
    def __init__(self, config):
        super().__init__(config)
        self.num_intents = config.num_labels
        self.num_slots = getattr(config, 'num_slot_labels', 3)
        self.roberta = XLMRobertaModel(config, add_pooling_layer=False)
        self.dropout = nn.Dropout(config.hidden_dropout_prob)
        self.intent_classifier = nn.Sequential(
            nn.Linear(config.hidden_size, config.hidden_size),
            nn.Tanh(),
            nn.Dropout(config.hidden_dropout_prob),
            nn.Linear(config.hidden_size, self.num_intents)
        )
        self.slot_classifier = nn.Linear(config.hidden_size, self.num_slots)
        self.post_init()

    def forward(self, input_ids=None, attention_mask=None, **kwargs):
        outputs = self.roberta(input_ids=input_ids, attention_mask=attention_mask, **kwargs)
        sequence_output = outputs[0]
        
        # intent (CLS token)
        cls_output = sequence_output[:, 0, :]
        cls_output = self.dropout(cls_output)
        intent_logits = self.intent_classifier(cls_output)
        
        # slots
        sequence_output = self.dropout(sequence_output)
        slot_logits = self.slot_classifier(sequence_output)
        
        return JointNLUOutput(
            intent_logits=intent_logits,
            slot_logits=slot_logits,
            hidden_states=outputs.hidden_states,
            attentions=outputs.attentions
        )

# ==============================================================================
# 3. MODAL APP SETUP
# ==============================================================================

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch", "transformers", "numpy", "fastapi")
)

app = modal.App("joint-nlu-service")
vol = modal.Volume.from_name("ai-assistant")

@app.cls(
    image=image,
    volumes={"/model": vol},
    cpu=2.0,           # 2 CPU Cores
    memory=2048,       # 2 GB RAM
    max_containers=5, # limit 5 concurrent containers
    scaledown_window=900, # shuts down after 15 min of no use
    enable_memory_snapshot=True
)
@modal.concurrent(max_inputs=20)
class ModelService:
    @modal.enter()
    def load_model(self):
        print(f"Cold Start: Loading model from {REMOTE_MODEL_DIR}...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # load Tokenizer & Model
        self.tokenizer = AutoTokenizer.from_pretrained(REMOTE_MODEL_DIR)
        self.model = XLMRobertaForJointNLU.from_pretrained(REMOTE_MODEL_DIR)
        self.model.to(self.device)
        self.model.eval()
        
        # load Mappings
        with open(os.path.join(REMOTE_MODEL_DIR, 'label_mappings.json'), 'r') as f:
            mappings = json.load(f)
            
        # Intent Map
        self.id2intent = {k: v for k, v in enumerate(_INTENTS)}
        
        # Slot Map
        raw_slot_map = mappings['id2slot']
        first_slot_key = next(iter(raw_slot_map.keys()))
        
        if str(first_slot_key).lstrip('-').isdigit():
            self.id2slot = {int(k): v for k, v in raw_slot_map.items()}
        else:
            self.id2slot = {v: k for k, v in raw_slot_map.items()}

        print(f"Model ready on {self.device}")

    @modal.method()
    def predict(self, text: str):
        # tokenize with offsets
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=128,
            return_offsets_mapping=True
        ).to(self.device)
        
        offsets = inputs.pop('offset_mapping')[0]
        
        # inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # decode intent
        intent_logits = outputs.intent_logits[0]
        intent_probs = torch.softmax(intent_logits, dim=0)
        intent_id = torch.argmax(intent_probs).item()
        intent_confidence = intent_probs[intent_id].item()
        
        # handle potential index error if list size mismatches config
        if intent_id in self.id2intent:
            intent = self.id2intent[intent_id]
        else:
            intent = f"unknown_id_{intent_id}"

        # decode slots
        slot_logits = outputs.slot_logits[0]
        slot_preds = torch.argmax(slot_logits, dim=-1).cpu().numpy()
        
        entities = []
        current_entity = None
        
        for i, (slot_id, (start_char, end_char)) in enumerate(zip(slot_preds, offsets)):
            if start_char == end_char: continue # Skip special tokens
            
            label = self.id2slot.get(slot_id, "O")
            
            if label.startswith('B-'):
                if current_entity: entities.append(current_entity)
                current_entity = {
                    'type': label[2:],
                    'start': start_char.item(),
                    'end': end_char.item(),
                    'value': text[start_char:end_char]
                }
            elif label.startswith('I-') and current_entity:
                current_entity['end'] = end_char.item()
                current_entity['value'] = text[current_entity['start']:end_char]
            else:
                if current_entity:
                    entities.append(current_entity)
                    current_entity = None
                    
        if current_entity: entities.append(current_entity)
        
        slots = {e['type']: e['value'] for e in entities}
        
        return {
            "text": text,
            "intent": intent,
            "confidence": float(intent_confidence),
            "slots": slots,
            "entities": entities
        }


class UserInput(BaseModel):
    text: str

@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def web_inference(item: UserInput):
    service = ModelService()
    return service.predict.remote(item.text)

@app.local_entrypoint()
def main():
    service = ModelService()
    
    test_texts = [
        "turn on the bedroom lights",
        "set an alarm for 7am tomorrow"
    ]
    
    for text in test_texts:
        result = service.predict.remote(text)
        print(f"\nInput: {result['text']}")
        print(f"Intent: {result['intent']} ({result['confidence']:.2%})")
        print(f"Slots: {result['slots']}")