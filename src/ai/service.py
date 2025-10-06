"""
Model Abstraction Service implementation
Provides a unified interface for interacting with different AI providers
"""
from typing import Dict, List, Optional, Any, TYPE_CHECKING

from src.ai.abstraction import (
    ChatModel,
    ConfiguredModels,
    EmbeddingModel,
    ModelAbstractionLayer,
    ModelProvider,
    Model,
)
from src.data.models.extended_models import (
    AIResponse,
    Credentials,
    EmbeddingResponse,
    Message,
    RerankResponse,
)

if TYPE_CHECKING:
    pass


class BaseModelProvider(ModelProvider):
    """Base implementation for model providers"""
    
    def __init__(self, name: str):
        self._name = name
        self._models: Dict[str, Any] = {}
    
    @property
    def name(self) -> str:
        return self._name
    
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""
        # Base implementation always returns True
        # Concrete providers should override this
        return True
    
    async def list_available_models(self) -> List["Model"]:
        """Get list of available models for a provider"""
        # Base implementation returns empty list
        # Concrete providers should override this
        return []
    
    def register_model(self, model_id: str, model: "Model") -> None:
        """Register a model with this provider"""
        self._models[model_id] = model
    
    def get_model(self, model_id: str) -> Optional["Model"]:
        """Get a model by ID"""
        return self._models.get(model_id)


class OpenAIProvider(BaseModelProvider):
    """OpenAI provider implementation"""
    
    def __init__(self):
        super().__init__("openai")
        self._api_key: Optional[str] = None
    
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate OpenAI API credentials"""
        try:
            import openai
            
            # Set API key
            openai.api_key = credentials.api_key
            
            # Make a simple API call to validate
            await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            
            # If we get here, the API key is valid
            self._api_key = credentials.api_key
            return True
            
        except Exception:
            return False
    
    async def list_available_models(self) -> List["Model"]:
        """Get list of available OpenAI models"""
        models = []
        
        # Chat models
        models.append(OpenAIChatModel("gpt-4", self))
        models.append(OpenAIChatModel("gpt-4-turbo", self))
        models.append(OpenAIChatModel("gpt-3.5-turbo", self))
        
        # Embedding models
        models.append(OpenAIEmbeddingModel("text-embedding-ada-002", self))
        
        return models


class OpenAIChatModel(ChatModel):
    """OpenAI chat model implementation"""
    
    def __init__(self, model_id: str, provider: OpenAIProvider):
        self._model_id = model_id
        self._provider = provider
    
    async def get_provider(self) -> ModelProvider:
        return self._provider
    
    async def get_id(self) -> str:
        return self._model_id
    
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to OpenAI and get response"""
        try:
            import openai
            
            # Set API key
            openai.api_key = self._provider._api_key
            
            # Convert messages to OpenAI format
            openai_messages = []
            for msg in messages:
                openai_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Make API call
            response = await openai.ChatCompletion.acreate(
                model=self._model_id,
                messages=openai_messages,
                temperature=temperature
            )
            
            # Extract response content
            content = response.choices[0].message.content
            
            # Extract token usage if available
            token_usage = None
            if hasattr(response, 'usage') and response.usage:
                token_usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            
            from datetime import datetime
            return AIResponse(
                content=content,
                model=self._model_id,
                provider=self._provider.name,
                usage=token_usage or {},
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            # Return error response
            from datetime import datetime
            return AIResponse(
                content=f"Error: {str(e)}",
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                timestamp=datetime.now().isoformat()
            )


class OpenAIEmbeddingModel(EmbeddingModel):
    """OpenAI embedding model implementation"""
    
    def __init__(self, model_id: str, provider: OpenAIProvider):
        self._model_id = model_id
        self._provider = provider
    
    async def get_provider(self) -> ModelProvider:
        return self._provider
    
    async def get_id(self) -> str:
        return self._model_id
    
    async def get_embeddings(
        self, texts: List[str], dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using OpenAI"""
        try:
            import openai
            
            # Set API key
            openai.api_key = self._provider._api_key
            
            # Make API call
            response = await openai.Embedding.acreate(
                model=self._model_id,
                input=texts
            )
            
            # Extract embeddings
            embeddings = []
            for item in response.data:
                embeddings.append(item.embedding)
            
            # Extract token usage if available
            token_usage = None
            if hasattr(response, 'usage') and response.usage:
                token_usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            
            return EmbeddingResponse(
                embeddings=embeddings,
                model=self._model_id,
                provider=self._provider.name,
                token_usage=token_usage
            )
            
        except Exception as e:
            # Return error response
            return EmbeddingResponse(
                embeddings=[],
                model=self._model_id,
                provider=self._provider.name,
                token_usage=None,
                error=str(e)
            )


class AnthropicProvider(BaseModelProvider):
    """Anthropic provider implementation"""
    
    def __init__(self):
        super().__init__("anthropic")
        self._api_key: Optional[str] = None
    
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate Anthropic API credentials"""
        try:
            import anthropic
            
            # Set API key
            client = anthropic.Anthropic(api_key=credentials.api_key)
            
            # Make a simple API call to validate
            await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hello"}]
            )
            
            # If we get here, the API key is valid
            self._api_key = credentials.api_key
            return True
            
        except Exception:
            return False
    
    async def list_available_models(self) -> List["Model"]:
        """Get list of available Anthropic models"""
        models = []
        
        # Chat models
        models.append(AnthropicChatModel("claude-3-opus-20240229", self))
        models.append(AnthropicChatModel("claude-3-sonnet-20240229", self))
        models.append(AnthropicChatModel("claude-3-haiku-20240307", self))
        
        return models


class AnthropicChatModel(ChatModel):
    """Anthropic chat model implementation"""
    
    def __init__(self, model_id: str, provider: AnthropicProvider):
        self._model_id = model_id
        self._provider = provider
    
    async def get_provider(self) -> ModelProvider:
        return self._provider
    
    async def get_id(self) -> str:
        return self._model_id
    
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to Anthropic and get response"""
        try:
            import anthropic
            
            # Set API key
            client = anthropic.Anthropic(api_key=self._provider._api_key)
            
            # Convert messages to Anthropic format
            # Anthropic requires the first message to be from user
            # and alternates between user and assistant
            anthropic_messages = []
            for msg in messages:
                if msg.role == "user":
                    anthropic_messages.append({"role": "user", "content": msg.content})
                elif msg.role == "assistant":
                    anthropic_messages.append({"role": "assistant", "content": msg.content})
                # Skip system messages for now
            
            # Make API call
            response = await client.messages.create(
                model=self._model_id,
                max_tokens=1000,  # Default max tokens
                temperature=temperature,
                messages=anthropic_messages
            )
            
            # Extract response content
            content = response.content[0].text
            
            from datetime import datetime
            return AIResponse(
                content=content,
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            # Return error response
            from datetime import datetime
            return AIResponse(
                content=f"Error: {str(e)}",
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                timestamp=datetime.now().isoformat()
            )


class LocalProvider(BaseModelProvider):
    """Local model provider implementation"""
    
    def __init__(self):
        super().__init__("local")
        self._base_url: Optional[str] = None
    
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate local model server credentials"""
        try:
            import requests
            
            # Set base URL
            self._base_url = credentials.base_url
            
            # Make a simple API call to validate
            response = requests.post(
                f"{self._base_url}/v1/chat/completions",
                json={
                    "model": "test",
                    "messages": [{"role": "user", "content": "Hello"}],
                    "max_tokens": 5
                },
                timeout=5
            )
            
            # If we get a valid response, the server is accessible
            return response.status_code == 200
            
        except Exception:
            return False
    
    async def list_available_models(self) -> List["Model"]:
        """Get list of available local models"""
        models = []
        
        # Chat models
        models.append(LocalChatModel("llama3", self))
        models.append(LocalChatModel("mistral", self))
        models.append(LocalChatModel("phi3", self))
        
        return models


class LocalChatModel(ChatModel):
    """Local chat model implementation"""
    
    def __init__(self, model_id: str, provider: LocalProvider):
        self._model_id = model_id
        self._provider = provider
    
    async def get_provider(self) -> ModelProvider:
        return self._provider
    
    async def get_id(self) -> str:
        return self._model_id
    
    async def send_message(self, messages: List[Message], temperature: float = 0.7) -> AIResponse:
        """Send message to local model and get response"""
        try:
            import requests
            
            # Convert messages to OpenAI-compatible format
            openai_messages = []
            for msg in messages:
                openai_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Make API call
            response = requests.post(
                f"{self._provider._base_url}/v1/chat/completions",
                json={
                    "model": self._model_id,
                    "messages": openai_messages,
                    "temperature": temperature
                },
                timeout=30
            )
            
            # Parse response
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Extract token usage if available
                token_usage = None
                if "usage" in data:
                    token_usage = {
                        "prompt_tokens": data["usage"].get("prompt_tokens", 0),
                        "completion_tokens": data["usage"].get("completion_tokens", 0),
                        "total_tokens": data["usage"].get("total_tokens", 0)
                    }
                
                from datetime import datetime
                return AIResponse(
                    content=content,
                    model=self._model_id,
                    provider=self._provider.name,
                    usage=token_usage or {},
                    timestamp=datetime.now().isoformat()
                )
            else:
                # Return error response
                from datetime import datetime
                return AIResponse(
                    content=f"Error: HTTP {response.status_code}",
                    model=self._model_id,
                    provider=self._provider.name,
                    usage={},
                    timestamp=datetime.now().isoformat()
                )
            
        except Exception as e:
            # Return error response
            from datetime import datetime
            return AIResponse(
                content=f"Error: {str(e)}",
                model=self._model_id,
                provider=self._provider.name,
                usage={},
                timestamp=datetime.now().isoformat()
            )


class ModelAbstractionService(ModelAbstractionLayer):
    """Service implementation for the Model Abstraction Layer"""
    
    def __init__(self):
        self._providers: Dict[str, ModelProvider] = {}
        self._configured_models: ConfiguredModels = ConfiguredModels(
            chat_model=None,
            embedding_model=None,
            rerank_model=None
        )
        
        # Register default providers
        self._register_default_providers()
    
    @property
    def providers(self) -> Dict[str, ModelProvider]:
        """Get all registered providers"""
        return self._providers
    
    def _register_default_providers(self) -> None:
        """Register default model providers"""
        self.register_provider(OpenAIProvider())
        self.register_provider(AnthropicProvider())
        self.register_provider(LocalProvider())
    
    def register_provider(self, provider: ModelProvider) -> None:
        """Register a model provider"""
        self._providers[provider.name] = provider
    
    def get_provider(self, name: str) -> Optional[ModelProvider]:
        """Get a provider by name"""
        return self._providers.get(name)
    
    async def send_message(
        self, messages: List[Message], temperature: float = 0.7
    ) -> AIResponse:
        """Send message to LLM provider and get response"""
        if not self._configured_models.chat_model:
            # Try to set a default chat model
            await self.set_chat_model()
        
        if not self._configured_models.chat_model:
            from datetime import datetime
            return AIResponse(
                content="Error: No chat model configured",
                model="unknown",
                provider="unknown",
                usage={},
                timestamp=datetime.now().isoformat()
            )
        
        return await self._configured_models.chat_model.send_message(messages, temperature)
    
    async def get_embeddings(
        self, texts: List[str], dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""
        if not self._configured_models.embedding_model:
            # Try to set a default embedding model
            await self.set_embedding_model()
        
        if not self._configured_models.embedding_model:
            return EmbeddingResponse(
                embeddings=[],
                model="unknown",
                provider="unknown",
                token_usage=None,
                error="No embedding model configured"
            )
        
        return await self._configured_models.embedding_model.get_embeddings(texts, dimensions)
    
    async def rerank(
        self, query: str, documents: List[str], top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance"""
        if not self._configured_models.rerank_model:
            # Try to set a default rerank model
            await self.set_rerank_model()
        
        if not self._configured_models.rerank_model:
            return RerankResponse(
                results=[],
                model="unknown",
                provider="unknown",
                token_usage=None,
                error="No rerank model configured"
            )
        
        return await self._configured_models.rerank_model.rerank(query, documents, top_k)
    
    async def set_chat_model(self, provider_name: str = None, model_id: str = None) -> None:
        """Set the chat model to use"""
        if provider_name is None:
            # Use default provider
            provider_name = "openai"
        
        if model_id is None:
            # Use default model for provider
            if provider_name == "openai":
                model_id = "gpt-3.5-turbo"
            elif provider_name == "anthropic":
                model_id = "claude-3-haiku-20240307"
            elif provider_name == "local":
                model_id = "llama3"
        
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")
        
        # Get available models
        models = await provider.list_available_models()
        
        # Find the requested model
        for model in models:
            if isinstance(model, ChatModel) and await model.get_id() == model_id:
                self._configured_models = ConfiguredModels(
                    chat_model=model,
                    embedding_model=self._configured_models.embedding_model,
                    rerank_model=self._configured_models.rerank_model
                )
                return
        
        raise ValueError(f"Unknown model: {model_id} for provider: {provider_name}")
    
    async def set_embedding_model(self, provider_name: str = None, model_id: str = None) -> None:
        """Set the embedding model to use"""
        if provider_name is None:
            # Use default provider
            provider_name = "openai"
        
        if model_id is None:
            # Use default model for provider
            if provider_name == "openai":
                model_id = "text-embedding-ada-002"
        
        provider = self.get_provider(provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {provider_name}")
        
        # Get available models
        models = await provider.list_available_models()
        
        # Find the requested model
        for model in models:
            if isinstance(model, EmbeddingModel) and await model.get_id() == model_id:
                self._configured_models = ConfiguredModels(
                    chat_model=self._configured_models.chat_model,
                    embedding_model=model,
                    rerank_model=self._configured_models.rerank_model
                )
                return
        
        raise ValueError(f"Unknown model: {model_id} for provider: {provider_name}")
    
    async def set_rerank_model(self, provider_name: str = None, model_id: str = None) -> None:
        """Set the rerank model to use"""
        # For now, we don't have any rerank models implemented
        # This is a placeholder for future implementation
        pass
    
    def inused_models(self) -> ConfiguredModels:
        """Get currently in-use models"""
        return self._configured_models
    
    def list_configured_models(self) -> Dict[str, List["Model"]]:
        """
        List all configured models grouped by provider.
        Each provider maps to a list of its models.
        models include chat, embedding, and rerank models.
        """
        result = {}
        
        for provider_name, provider in self._providers.items():
            # Get all models for this provider
            models = []
            
            # Add chat models
            if self._configured_models.chat_model and self._configured_models.chat_model.get_provider() == provider:
                models.append(self._configured_models.chat_model)
            
            # Add embedding models
            if self._configured_models.embedding_model and self._configured_models.embedding_model.get_provider() == provider:
                models.append(self._configured_models.embedding_model)
            
            # Add rerank models
            if self._configured_models.rerank_model and self._configured_models.rerank_model.get_provider() == provider:
                models.append(self._configured_models.rerank_model)
            
            if models:
                result[provider_name] = models
        
        return result
    
    async def validate_api_key(self, provider_name: str, api_key: str) -> bool:
        """Validate an API key for a provider"""
        provider = self.get_provider(provider_name)
        if not provider:
            return False
        
        credentials = Credentials(api_key=api_key)
        return await provider.validate_credentials(provider_name, credentials)
