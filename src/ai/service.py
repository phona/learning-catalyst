"""
Model abstraction service implementation
"""
import httpx
from datetime import datetime
from typing import List, Optional
from .abstraction import ModelAbstractionLayer
from src.data.models.extended_models import Message, AIResponse, Credentials, EmbeddingResponse, RerankResponse, ProviderCapabilities
from .providers.openai_provider import OpenAIProvider
from .providers.claude_provider import ClaudeProvider
from .providers.chatglm_provider import ChatGLMProvider
from .providers.siliconflow_provider import SiliconFlowProvider
from .providers.deepseek_provider import DeepSeekProvider
from .providers.local_provider import LocalModelProvider
from .providers.embedding_provider import EmbeddingProvider
from .providers.rerank_provider import RerankProvider


class ModelAbstractionService(ModelAbstractionLayer):
    def __init__(self):
        self.providers = {
            "openai": None,
            "anthropic": None,
            "chatglm": None,
            "siliconflow": None,
            "deepseek": None,
            "local": None,
            "embedding": None,
            "rerank": None
        }

    def set_provider(self, provider_type: str, provider_instance):
        self.providers[provider_type] = provider_instance

    async def send_message(
        self, 
        provider: str, 
        model: str, 
        messages: List[Message],
        temperature: float = 0.7
    ) -> AIResponse:
        # Convert messages to the format expected by the provider
        message_dicts = [{"role": msg.role, "content": msg.content} for msg in messages]

        if provider == "openai" and self.providers["openai"]:
            result = await self.providers["openai"].send_message(model, message_dicts, temperature)
            # Format response to AIResponse object
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=model,
                usage={
                    "input_tokens": result["usage"]["prompt_tokens"],
                    "output_tokens": result["usage"]["completion_tokens"],
                    "total_tokens": result["usage"]["total_tokens"]
                },
                timestamp=str(datetime.now())
            )
        elif provider == "anthropic" and self.providers["anthropic"]:
            # Claude has a slightly different API, so special handling would be needed
            result = await self.providers["anthropic"].send_message(model, message_dicts, temperature)
            return AIResponse(
                content=result["content"][0]["text"],
                model=model,
                usage={
                    "input_tokens": result["usage"]["input_tokens"],
                    "output_tokens": result["usage"]["output_tokens"],
                    "total_tokens": result["usage"]["input_tokens"] + result["usage"]["output_tokens"]
                },
                timestamp=str(datetime.now())
            )
        elif provider == "chatglm" and self.providers["chatglm"]:
            result = await self.providers["chatglm"].send_message(model, message_dicts, temperature)
            # Format accordingly
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=model,
                usage={
                    "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                    "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
                    "total_tokens": result.get("usage", {}).get("total_tokens", 0)
                },
                timestamp=str(datetime.now())
            )
        elif provider == "siliconflow" and self.providers["siliconflow"]:
            result = await self.providers["siliconflow"].send_message(model, message_dicts, temperature)
            # Format accordingly
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=model,
                usage={
                    "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                    "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
                    "total_tokens": result.get("usage", {}).get("total_tokens", 0)
                },
                timestamp=str(datetime.now())
            )
        elif provider == "deepseek" and self.providers["deepseek"]:
            result = await self.providers["deepseek"].send_message(model, message_dicts, temperature)
            # Format accordingly
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=model,
                usage={
                    "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                    "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
                    "total_tokens": result.get("usage", {}).get("total_tokens", 0)
                },
                timestamp=str(datetime.now())
            )
        elif provider == "local" and self.providers["local"]:
            result = await self.providers["local"].send_message(model, message_dicts, temperature)
            # Format accordingly
            return AIResponse(
                content=result["choices"][0]["message"]["content"],
                model=model,
                usage={
                    "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                    "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
                    "total_tokens": result.get("usage", {}).get("total_tokens", 0)
                },
                timestamp=str(datetime.now())
            )
        else:
            raise ValueError(f"Provider {provider} not implemented or not set")

    async def get_embeddings(
        self,
        provider: str,
        model: str,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        if provider == "openai" and self.providers["openai"]:
            result = await self.providers["openai"].get_embeddings(model, texts)
            embeddings = [item["embedding"] for item in result["data"]]
            usage = {
                "input_tokens": result["usage"]["prompt_tokens"],
                "output_tokens": result["usage"]["completion_tokens"],
                "total_tokens": result["usage"]["total_tokens"]
            }
        elif provider == "embedding" and self.providers["embedding"]:
            result = await self.providers["embedding"].get_embeddings(model, texts)
            embeddings = result["data"]  # Assuming the provider handles the format
            usage = {
                "input_tokens": result.get("usage", {}).get("prompt_tokens", 0),
                "output_tokens": result.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": result.get("usage", {}).get("total_tokens", 0)
            }
        else:
            raise ValueError(f"Embedding provider {provider} not implemented or not set")
        
        return EmbeddingResponse(
            embeddings=embeddings,
            model=model,
            usage=usage
        )

    async def rerank(
        self,
        provider: str,
        model: str,
        query: str,
        documents: List[str],
        top_k: int = 10
    ) -> RerankResponse:
        if provider == "rerank" and self.providers["rerank"]:
            result = await self.providers["rerank"].rerank(model, query, documents, top_k)
            return RerankResponse(
                results=result["results"],
                model=model
            )
        else:
            raise ValueError(f"Rerank provider {provider} not implemented or not set")

    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        if provider == "openai" and self.providers["openai"]:
            return await self.providers["openai"].validate_credentials(credentials)
        elif provider == "anthropic" and self.providers["anthropic"]:
            return await self.providers["anthropic"].validate_credentials(credentials)
        elif provider == "chatglm" and self.providers["chatglm"]:
            return await self.providers["chatglm"].validate_credentials(credentials)
        elif provider == "siliconflow" and self.providers["siliconflow"]:
            return await self.providers["siliconflow"].validate_credentials(credentials)
        elif provider == "deepseek" and self.providers["deepseek"]:
            return await self.providers["deepseek"].validate_credentials(credentials)
        elif provider == "local" and self.providers["local"]:
            return await self.providers["local"].validate_credentials(credentials)
        elif provider == "embedding" and self.providers["embedding"]:
            return await self.providers["embedding"].validate_credentials(credentials)
        elif provider == "rerank" and self.providers["rerank"]:
            return await self.providers["rerank"].validate_credentials(credentials)
        else:
            raise ValueError(f"Provider {provider} not implemented or not set")

    async def list_available_models(self, provider: str) -> List[str]:
        if provider == "openai" and self.providers["openai"]:
            return await self.providers["openai"].list_available_models()
        elif provider == "anthropic" and self.providers["anthropic"]:
            return await self.providers["anthropic"].list_available_models()
        elif provider == "chatglm" and self.providers["chatglm"]:
            return await self.providers["chatglm"].list_available_models()
        elif provider == "siliconflow" and self.providers["siliconflow"]:
            return await self.providers["siliconflow"].list_available_models()
        elif provider == "deepseek" and self.providers["deepseek"]:
            return await self.providers["deepseek"].list_available_models()
        elif provider == "local" and self.providers["local"]:
            return await self.providers["local"].list_available_models()
        elif provider == "embedding" and self.providers["embedding"]:
            return await self.providers["embedding"].list_available_models()
        elif provider == "rerank" and self.providers["rerank"]:
            return await self.providers["rerank"].list_available_models()
        else:
            raise ValueError(f"Provider {provider} not implemented or not set")

    async def get_provider_capabilities(self, provider: str) -> ProviderCapabilities:
        if provider == "openai" and self.providers["openai"]:
            return await self.providers["openai"].get_provider_capabilities()
        elif provider == "anthropic" and self.providers["anthropic"]:
            return await self.providers["anthropic"].get_provider_capabilities()
        elif provider == "chatglm" and self.providers["chatglm"]:
            return await self.providers["chatglm"].get_provider_capabilities()
        elif provider == "siliconflow" and self.providers["siliconflow"]:
            return await self.providers["siliconflow"].get_provider_capabilities()
        elif provider == "deepseek" and self.providers["deepseek"]:
            return await self.providers["deepseek"].get_provider_capabilities()
        elif provider == "local" and self.providers["local"]:
            return await self.providers["local"].get_provider_capabilities()
        elif provider == "embedding" and self.providers["embedding"]:
            return await self.providers["embedding"].get_provider_capabilities()
        elif provider == "rerank" and self.providers["rerank"]:
            return await self.providers["rerank"].get_provider_capabilities()
        else:
            raise ValueError(f"Provider {provider} not implemented or not set")