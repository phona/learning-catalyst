import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import type { ContentRecommendation, DiscoveryFilter, SearchResult } from '@/types/content';
import { contentDiscoveryService } from '@/services/ContentDiscoveryService';

interface ContentDiscoveryProps {
  userId: string;
  onConceptSelect?: (conceptId: string) => void;
  onPathSelect?: (pathId: string) => void;
  className?: string;
}

export const ContentDiscovery: React.FC<ContentDiscoveryProps> = ({
  userId,
  onConceptSelect,
  onPathSelect,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'search' | 'explore'>('recommendations');
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const recs = await contentDiscoveryService.getLearningRecommendations(userId, {
        limit: 12,
        includeCompleted: false
      });
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await contentDiscoveryService.searchConcepts(query, {
        limit: 20,
        difficultyRange: filters.difficulty || [0, 1],
        topicFilter: filters.topics || []
      });

      // Convert to SearchResult format
      const searchResults: SearchResult[] = results.map(concept => ({
        id: concept.id,
        type: 'concept',
        title: concept.name,
        description: concept.description || '',
        relevanceScore: 0.8, // Calculate based on search algorithm
        matchType: 'partial' as const,
        metadata: {
          difficulty: concept.difficultyLevel / 5, // Convert 1-5 to 0-1
          tags: concept.tags
        }
      }));

      setSearchResults(searchResults);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendationClick = (rec: ContentRecommendation) => {
    if (rec.type === 'concept' && onConceptSelect) {
      onConceptSelect(rec.id);
    } else if (rec.type === 'path' && onPathSelect) {
      onPathSelect(rec.id);
    }
  };

  const getRecommendationIcon = (type: ContentRecommendation['type']) => {
    switch (type) {
      case 'concept':
        return <BookOpenIcon className="w-5 h-5" />;
      case 'path':
        return <AcademicCapIcon className="w-5 h-5" />;
      case 'resource':
        return <SparklesIcon className="w-5 h-5" />;
      case 'practice':
        return <ChartBarIcon className="w-5 h-5" />;
      case 'quiz':
        return <FunnelIcon className="w-5 h-5" />;
      default:
        return <BookOpenIcon className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: ContentRecommendation['type']) => {
    switch (type) {
      case 'concept':
        return 'text-blue-600 bg-blue-100';
      case 'path':
        return 'text-purple-600 bg-purple-100';
      case 'resource':
        return 'text-green-600 bg-green-100';
      case 'practice':
        return 'text-orange-600 bg-orange-100';
      case 'quiz':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.3) return 'text-green-600';
    if (difficulty < 0.6) return 'text-yellow-600';
    if (difficulty < 0.8) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const updateFilter = (key: keyof DiscoveryFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setShowFilters(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Content Discovery
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'explore'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            Explore
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search concepts, topics, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              >
                <FunnelIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Filters</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Difficulty
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={filters.difficulty?.[0] || 0}
                      onChange={(e) => updateFilter('difficulty', [parseFloat(e.target.value), filters.difficulty?.[1] || 1])}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Difficulty
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={filters.difficulty?.[1] || 1}
                      onChange={(e) => updateFilter('difficulty', [filters.difficulty?.[0] || 0, parseFloat(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Found {searchResults.length} results
                </h3>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => onConceptSelect?.(result.id)}
                    className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(result.type as any)}`}>
                          {getRecommendationIcon(result.type as any)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {result.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs ${getDifficultyColor(result.metadata?.difficulty || 0)}`}>
                            {result.metadata?.difficulty ? Math.round(result.metadata.difficulty * 100) : 0}% difficulty
                          </span>
                          {result.metadata?.tags && result.metadata.tags.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {result.metadata.tags.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try different keywords or check spelling</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recommended for you
                </h3>
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleRecommendationClick(rec)}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(rec.type)}`}>
                          {getRecommendationIcon(rec.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {rec.title}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(rec.type)}`}>
                            {rec.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className={`flex items-center ${getDifficultyColor(rec.difficulty)}`}>
                              <AcademicCapIcon className="w-3 h-3 mr-1" />
                              {Math.round(rec.difficulty * 100)}% difficulty
                            </span>
                            <span className="flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatTime(rec.estimatedTime)}
                            </span>
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {rec.reason}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recommendations available yet</p>
                <p className="text-sm mt-1">Start learning to get personalized suggestions</p>
              </div>
            )}
          </div>
        )}

        {/* Explore Tab */}
        {activeTab === 'explore' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Explore content by topics</p>
            <p className="text-sm mt-1">Browse through different learning paths and discover new concepts</p>
          </div>
        )}
      </div>
    </div>
  );
};