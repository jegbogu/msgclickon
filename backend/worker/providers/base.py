# worker/providers/base.py
from abc import ABC, abstractmethod

class Provider(ABC):
    @abstractmethod
    def send(self, to: str, subject: str | None, body: str) -> str:
        """Send a message. Return the provider's message ID."""