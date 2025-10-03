"""
Unit tests for AI integration layer
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.ai.abstraction import ModelAbstractionLayer
from src.ai.service import ModelAbstractionService
from src.ai.providers.openai_provider import OpenAIProvider
from src.ai.providers.claude_provider import ClaudeProvider
from src.data.models.extended_models import Message, Credentials, ProviderCapabilities


class TestModelAbstractionService:
    @pytest.fixture
    def model_service(self):
        service = ModelAbstractionService()
        # Mock providers
        service.providers["openai"] = AsyncMock()
        service.providers["anthropic"] = AsyncMock()
        service.providers["chatglm"] = AsyncMock()
        service.providers["siliconflow"] = AsyncMock()
        service.providers["deepseek"] = AsyncMock()
        service.providers["local"] = AsyncMock()
        service.providers["embedding"] = AsyncMock()
        service.providers["rerank"] = AsyncMock()
        return service

    @pytest.mark.asyncio
    async def test_send_message_openai(self, model_service):
        """Test sending message via OpenAI provider"""
        # Mock the OpenAI provider's response
        mock_response = {
            "choices": [{"message": {"content": "Test response"}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
        }
        model_service.providers["openai"].send_message.return_value = mock_response
        
        # Create test messages
        messages = [Message(role="user", content="Hello")]
        
        # Call send_message
        result = await model_service.send_message(
            provider="openai",
            model="gpt-4",
            messages=messages
        )
        
        # Verify the result
        assert result.content == "Test response"
        assert result.model == "gpt-4"
        assert result.usage == {
            "input_tokens": 10,
            "output_tokens": 20,
            "total_tokens": 30
        }
        
        # Verify the provider method was called
        model_service.providers["openai"].send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_claude(self, model_service):
        """Test sending message via Claude provider"""
        # Mock the Claude provider's response
        mock_response = {
            "content": [{"text": "Test response from Claude"}],
            "usage": {"input_tokens": 15, "output_tokens": 25}
        }
        model_service.providers["anthropic"].send_message.return_value = mock_response
        
        # Create test messages
        messages = [Message(role="user", content="Hello")]
        
        # Call send_message
        result = await model_service.send_message(
            provider="anthropic",
            model="claude-3",
            messages=messages
        )
        
        # Verify the result
        assert result.content == "Test response from Claude"
        assert result.model == "claude-3"
        assert result.usage == {
            "input_tokens": 15,
            "output_tokens": 25,
            "total_tokens": 40
        }
        
        # Verify the provider method was called
        model_service.providers["anthropic"].send_message.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_embeddings(self, model_service):
        """Test getting embeddings"""
        # Mock the embedding provider's response
        mock_response = {
            "data": [[0.1, 0.2, 0.3]],
            "usage": {"prompt_tokens": 5}
        }
        model_service.providers["embedding"].get_embeddings.return_value = mock_response
        
        # Call get_embeddings
        result = await model_service.get_embeddings(
            provider="embedding",
            model="text-embedding-ada-002",
            texts=["test text"]
        )
        
        # Verify the result
        assert result.embeddings == [[0.1, 0.2, 0.3]]
        assert result.model == "text-embedding-ada-002"
        assert result.usage == {"input_tokens": 5, "output_tokens": 0, "total_tokens": 5}
        
        # Verify the provider method was called
        model_service.providers["embedding"].get_embeddings.assert_called_once()

    @pytest.mark.asyncio
    async def test_rerank(self, model_service):
        """Test rerank functionality"""
        # Mock the rerank provider's response
        mock_response = {
            "results": [{"document": "doc1", "relevance_score": 0.9}]
        }
        model_service.providers["rerank"].rerank.return_value = mock_response
        
        # Call rerank
        result = await model_service.rerank(
            provider="rerank",
            model="rerank-model",
            query="test query",
            documents=["doc1", "doc2"],
            top_k=5
        )
        
        # Verify the result
        assert result.results == [{"document": "doc1", "relevance_score": 0.9}]
        assert result.model == "rerank-model"
        
        # Verify the provider method was called
        model_service.providers["rerank"].rerank.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_credentials(self, model_service):
        """Test credential validation"""
        # Mock the validation response
        model_service.providers["openai"].validate_credentials.return_value = True
        
        # Create test credentials
        creds = Credentials(
            provider="openai",
            api_key="test_key"
        )
        
        # Call validate_credentials
        result = await model_service.validate_credentials("openai", creds)
        
        # Verify the result
        assert result is True
        
        # Verify the provider method was called
        model_service.providers["openai"].validate_credentials.assert_called_once_with(creds)

    @pytest.mark.asyncio
    async def test_list_available_models(self, model_service):
        """Test listing available models"""
        # Mock the response
        mock_models = ["gpt-4", "gpt-3.5-turbo"]
        model_service.providers["openai"].list_available_models.return_value = mock_models
        
        # Call list_available_models
        result = await model_service.list_available_models("openai")
        
        # Verify the result
        assert result == mock_models
        
        # Verify the provider method was called
        model_service.providers["openai"].list_available_models.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_provider_capabilities(self, model_service):
        """Test getting provider capabilities"""
        # Mock the response
        mock_capabilities = ProviderCapabilities(
            supports_streaming=True,
            max_tokens=4096,
            supported_models=["gpt-4"],
            input_cost_per_token=0.01,
            output_cost_per_token=0.03,
            supports_embeddings=True,
            supports_rerank=False
        )
        model_service.providers["openai"].get_provider_capabilities.return_value = mock_capabilities
        
        # Call get_provider_capabilities
        result = await model_service.get_provider_capabilities("openai")
        
        # Verify the result
        assert result == mock_capabilities
        
        # Verify the provider method was called
        model_service.providers["openai"].get_provider_capabilities.assert_called_once()

    def test_set_provider(self, model_service):
        """Test setting a provider"""
        # Create a mock provider
        mock_provider = AsyncMock()
        
        # Set the provider
        model_service.set_provider("test_provider", mock_provider)
        
        # Verify the provider was set
        assert model_service.providers["test_provider"] == mock_provider

    @pytest.mark.asyncio
    async def test_send_message_unknown_provider(self, model_service):
        """Test sending message with unknown provider"""
        with pytest.raises(ValueError, match="Provider unknown_provider not implemented or not set"):
            await model_service.send_message(
                provider="unknown_provider",
                model="test_model",
                messages=[Message(role="user", content="Hello")]
            )

    @pytest.mark.asyncio
    async def test_get_embeddings_unknown_provider(self, model_service):
        """Test getting embeddings with unknown provider"""
        with pytest.raises(ValueError, match="Embedding provider unknown_provider not implemented or not set"):
            await model_service.get_embeddings(
                provider="unknown_provider",
                model="test_model",
                texts=["test"]
            )

    @pytest.mark.asyncio
    async def test_rerank_unknown_provider(self, model_service):
        """Test rerank with unknown provider"""
        with pytest.raises(ValueError, match="Rerank provider unknown_provider not implemented or not set"):
            await model_service.rerank(
                provider="unknown_provider",
                model="test_model",
                query="test",
                documents=["doc1"],
                top_k=5
            )


class TestOpenAIProvider:
    @pytest.fixture
    def openai_provider(self):
        return OpenAIProvider(api_key="test_api_key")

    @pytest.mark.asyncio
    async def test_send_message(self, openai_provider):
        """Test sending message with OpenAI provider"""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock the response
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Test response"}}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
            }
            mock_response.raise_for_status.return_value = None
            mock_post.return_value = mock_response
            
            # Call send_message
            result = await openai_provider.send_message(
                model="gpt-4",
                messages=[{"role": "user", "content": "Hello"}],
                temperature=0.7
            )
            
            # Verify the response
            assert result["choices"][0]["message"]["content"] == "Test response"
            assert result["usage"]["prompt_tokens"] == 10

    @pytest.mark.asyncio
    async def test_get_embeddings(self, openai_provider):
        """Test getting embeddings with OpenAI provider"""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock the response
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "data": [{"embedding": [0.1, 0.2, 0.3]}],
                "usage": {"prompt_tokens": 5, "total_tokens": 5}
            }
            mock_response.raise_for_status.return_value = None
            mock_post.return_value = mock_response
            
            # Call get_embeddings
            result = await openai_provider.get_embeddings(
                model="text-embedding-ada-002",
                texts=["test text"]
            )
            
            # Verify the response
            assert result["data"][0]["embedding"] == [0.1, 0.2, 0.3]
            assert result["usage"]["prompt_tokens"] == 5

    @pytest.mark.asyncio
    async def test_validate_credentials(self):
        """Test validating OpenAI credentials"""
        provider = OpenAIProvider(api_key="valid_key")
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Mock a successful response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            # Test valid credentials
            creds = Credentials(provider="openai", api_key="valid_key")
            result = await provider.validate_credentials(creds)
            
            assert result is True

    @pytest.mark.asyncio
    async def test_validate_credentials_invalid(self):
        """Test validating invalid OpenAI credentials"""
        provider = OpenAIProvider(api_key="invalid_key")
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Mock an exception
            mock_get.side_effect = Exception("Invalid credentials")
            
            # Test invalid credentials
            creds = Credentials(provider="openai", api_key="invalid_key")
            result = await provider.validate_credentials(creds)
            
            assert result is False


class TestClaudeProvider:
    @pytest.fixture
    def claude_provider(self):
        return ClaudeProvider(api_key="test_api_key")

    @pytest.mark.asyncio
    async def test_send_message(self, claude_provider):
        """Test sending message with Claude provider"""
        with patch('httpx.AsyncClient.post') as mock_post:
            # Mock the response
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                "content": [{"text": "Test response from Claude"}],
                "usage": {"input_tokens": 15, "output_tokens": 25}
            }
            mock_response.raise_for_status.return_value = None
            mock_post.return_value = mock_response
            
            # Call send_message with Claude format
            result = await claude_provider.send_message(
                model="claude-3",
                messages=[{"role": "user", "content": "Hello"}],
                temperature=0.7
            )
            
            # Verify the response
            assert result["content"][0]["text"] == "Test response from Claude"
            assert result["usage"]["input_tokens"] == 15

    @pytest.mark.asyncio
    async def test_get_embeddings_not_implemented(self, claude_provider):
        """Test that Claude doesn't support embeddings"""
        with pytest.raises(NotImplementedError):
            await claude_provider.get_embeddings(
                model="test_model",
                texts=["test text"]
            )

    @pytest.mark.asyncio
    async def test_validate_credentials(self):
        """Test validating Claude credentials"""
        provider = ClaudeProvider(api_key="valid_key")
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Mock a successful response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            # Test valid credentials
            creds = Credentials(provider="anthropic", api_key="valid_key")
            result = await provider.validate_credentials(creds)
            
            assert result is True

    @pytest.mark.asyncio
    async def test_validate_credentials_invalid(self):
        """Test validating invalid Claude credentials"""
        provider = ClaudeProvider(api_key="invalid_key")
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Mock an exception
            mock_get.side_effect = Exception("Invalid credentials")
            
            # Test invalid credentials
            creds = Credentials(provider="anthropic", api_key="invalid_key")
            result = await provider.validate_credentials(creds)
            
            assert result is False


if __name__ == "__main__":
    pytest.main([__file__])