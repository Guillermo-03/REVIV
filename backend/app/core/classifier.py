import io
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

SEVERITY_LABELS = ["clean", "low", "medium", "high"]
NUM_CLASSES = len(SEVERITY_LABELS)
IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
TTA_N = 8

_model: nn.Module | None = None
_device: torch.device | None = None

_center_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

_tta_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])


def load_classifier(model_path: str = "trash_severity_classifier.pt") -> None:
    global _model, _device
    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint = torch.load(model_path, map_location=_device, weights_only=True)

    model = models.efficientnet_b3(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.5, inplace=True),
        nn.Linear(1536, NUM_CLASSES),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    _model = model.to(_device)
    print(f"Classifier loaded on {_device}")


def classify_image(image_bytes: bytes) -> str:
    if _model is None:
        return "low"

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    probs = torch.zeros(NUM_CLASSES)

    with torch.no_grad():
        t = _center_transform(img).unsqueeze(0).to(_device)
        probs += torch.softmax(_model(t), dim=1).squeeze().cpu()
        for _ in range(TTA_N - 1):
            t = _tta_transform(img).unsqueeze(0).to(_device)
            probs += torch.softmax(_model(t), dim=1).squeeze().cpu()

    probs /= TTA_N
    return SEVERITY_LABELS[int(probs.argmax())]
