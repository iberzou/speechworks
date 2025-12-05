/**
 * SpeechWorks - Resources Controller
 * Handles therapy resource library
 */

app.controller('ResourcesController', ['$scope', '$window', 'ApiService', 'ToastService',
    function($scope, $window, ApiService, ToastService) {
        
        // Initialize data
        $scope.resources = [];
        $scope.allResources = []; // Store all resources (API + local)
        $scope.localResources = []; // Locally uploaded resources
        $scope.resourceType = '';
        
        // Modal state
        $scope.showUploadModal = false;
        $scope.uploadForm = {};
        
        // Load local resources from localStorage
        function loadLocalResources() {
            try {
                var stored = $window.localStorage.getItem('speechworks_resources');
                if (stored) {
                    $scope.localResources = JSON.parse(stored);
                } else {
                    $scope.localResources = [];
                }
            } catch (e) {
                $scope.localResources = [];
            }
        }
        
        // Save local resources to localStorage
        function saveLocalResources() {
            try {
                $window.localStorage.setItem('speechworks_resources', JSON.stringify($scope.localResources));
            } catch (e) {
                console.error('Failed to save resources to localStorage:', e);
            }
        }
        
        // Load resources from API
        function loadResources() {
            // Always reload local resources first to ensure we have the latest
            loadLocalResources();
            
            var params = {};
            if ($scope.resourceType) params.resource_type = $scope.resourceType;
            
            ApiService.getResources(params)
                .then(function(response) {
                    var apiResources = response.data || [];
                    combineAndFilterResources(apiResources);
                })
                .catch(function(error) {
                    // If API fails, use sample + local resources
                    var sampleResources = getSampleResources();
                    combineAndFilterResources(sampleResources);
                });
        }
        
        // Combine API resources with local resources and apply filter
        function combineAndFilterResources(apiResources) {
            // Combine API/sample resources with local uploads
            $scope.allResources = apiResources.concat($scope.localResources);
            
            // Apply type filter
            if ($scope.resourceType) {
                $scope.resources = $scope.allResources.filter(function(r) {
                    return r.resource_type === $scope.resourceType;
                });
            } else {
                $scope.resources = $scope.allResources.slice(); // Create a copy
            }
        }
        
        // Filter by type
        $scope.filterByType = function(type) {
            $scope.resourceType = type;
            
            // Reload local resources first to ensure we have latest data
            loadLocalResources();
            
            // Get sample/API resources
            var sampleResources = getSampleResources();
            
            // Combine with local resources
            $scope.allResources = sampleResources.concat($scope.localResources);
            
            // Apply filter to combined resources
            if (type) {
                $scope.resources = $scope.allResources.filter(function(r) {
                    return r.resource_type === type;
                });
            } else {
                $scope.resources = $scope.allResources.slice(); // Show all
            }
        };
        
        // Download resource
        $scope.downloadResource = function(resource) {
            // Check if it's a local resource with file data
            if (resource.isLocal) {
                if (resource.fileData && resource.fileName) {
                    // Create download link for local file
                    try {
                        var link = document.createElement('a');
                        link.href = resource.fileData;
                        link.download = resource.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        ToastService.success('Download started: ' + resource.fileName);
                        
                        // Update download count
                        resource.download_count = (resource.download_count || 0) + 1;
                        saveLocalResources();
                    } catch (e) {
                        ToastService.error('Failed to download file');
                    }
                } else {
                    ToastService.info('Resource: ' + resource.title + ' - This is a demo resource without an attached file.');
                }
                return;
            }
            
            // For API resources
            ApiService.downloadResource(resource.id)
                .then(function(response) {
                    if (response.data.download_url) {
                        window.open(response.data.download_url, '_blank');
                        ToastService.success('Download started');
                    } else {
                        ToastService.info('Resource: ' + resource.title);
                    }
                })
                .catch(function(error) {
                    // For demo/sample resources, show info message
                    ToastService.info('Resource: ' + resource.title + ' - Download not available in demo mode');
                });
        };
        
        // Open upload modal
        $scope.openUploadModal = function() {
            $scope.uploadForm = {
                title: '',
                description: '',
                resource_type: 'worksheet',
                category: '',
                is_public: true,
                file: null,
                fileName: '',
                fileData: null
            };
            $scope.showUploadModal = true;
            
            // Initialize file handler after modal opens
            setTimeout(function() {
                initFileHandler();
            }, 100);
        };
        
        // Close upload modal
        $scope.closeUploadModal = function() {
            $scope.showUploadModal = false;
            $scope.uploadForm = {};
        };
        
        // Handle file selection
        $scope.handleFileSelect = function(event) {
            var file = event.target.files[0];
            if (file) {
                $scope.uploadForm.fileName = file.name;
                
                // Read file as data URL for local storage
                var reader = new FileReader();
                reader.onload = function(e) {
                    $scope.$apply(function() {
                        $scope.uploadForm.fileData = e.target.result;
                    });
                };
                reader.readAsDataURL(file);
            }
        };
        
        // Save/upload resource
        $scope.saveResource = function() {
            if (!$scope.uploadForm.title) {
                ToastService.error('Please enter a title');
                return;
            }
            
            ApiService.createResource($scope.uploadForm)
                .then(function(response) {
                    ToastService.success('Resource uploaded successfully');
                    $scope.closeUploadModal();
                    loadResources();
                })
                .catch(function(error) {
                    // For demo: add to local storage
                    var newResource = {
                        id: 'local_' + Date.now(),
                        title: $scope.uploadForm.title,
                        description: $scope.uploadForm.description || '',
                        resource_type: $scope.uploadForm.resource_type,
                        category: $scope.uploadForm.category,
                        download_count: 0,
                        created_at: new Date().toISOString(),
                        isLocal: true,
                        fileName: $scope.uploadForm.fileName || null,
                        fileData: $scope.uploadForm.fileData || null
                    };
                    
                    $scope.localResources.push(newResource);
                    saveLocalResources();
                    
                    // Update allResources and apply current filter
                    $scope.allResources.push(newResource);
                    
                    // Re-apply filter
                    if ($scope.resourceType) {
                        if (newResource.resource_type === $scope.resourceType) {
                            $scope.resources.push(newResource);
                        }
                    } else {
                        $scope.resources.push(newResource);
                    }
                    
                    ToastService.success('Resource added successfully');
                    $scope.closeUploadModal();
                });
        };
        
        // Delete local resource
        $scope.deleteResource = function(resource) {
            if (!resource.isLocal) {
                ToastService.error('Cannot delete API resources');
                return;
            }
            
            if (confirm('Are you sure you want to delete this resource?')) {
                // Remove from localResources
                $scope.localResources = $scope.localResources.filter(function(r) {
                    return r.id !== resource.id;
                });
                saveLocalResources();
                
                // Remove from allResources
                $scope.allResources = $scope.allResources.filter(function(r) {
                    return r.id !== resource.id;
                });
                
                // Remove from displayed resources
                $scope.resources = $scope.resources.filter(function(r) {
                    return r.id !== resource.id;
                });
                
                ToastService.success('Resource deleted');
            }
        };
        
        // Sample resources for demo
        function getSampleResources() {
            return [
                {
                    id: 1,
                    title: 'S Sound Articulation Worksheet',
                    description: 'Practice worksheet for /s/ sound in initial, medial, and final positions.',
                    resource_type: 'worksheet',
                    category: 'articulation',
                    download_count: 245,
                    created_at: '2024-01-15'
                },
                {
                    id: 2,
                    title: 'R Sound Flashcards',
                    description: 'Colorful flashcards for practicing /r/ sound with pictures.',
                    resource_type: 'flashcard',
                    category: 'articulation',
                    download_count: 189,
                    created_at: '2024-01-10'
                },
                {
                    id: 3,
                    title: 'Fluency Strategies Guide',
                    description: 'Comprehensive guide for fluency strategies including easy onset and stretching.',
                    resource_type: 'guide',
                    category: 'fluency',
                    download_count: 156,
                    created_at: '2024-01-08'
                },
                {
                    id: 4,
                    title: 'Naming Practice - Animals',
                    description: 'Picture cards for naming practice with common animals.',
                    resource_type: 'flashcard',
                    category: 'language',
                    download_count: 312,
                    created_at: '2024-01-05'
                },
                {
                    id: 5,
                    title: 'Voice Warm-Up Exercises',
                    description: 'Audio guide for voice therapy warm-up exercises.',
                    resource_type: 'audio',
                    category: 'voice',
                    download_count: 98,
                    created_at: '2024-01-02'
                },
                {
                    id: 6,
                    title: 'TH Sound Practice Sheets',
                    description: 'Worksheets for voiced and voiceless TH sound practice.',
                    resource_type: 'worksheet',
                    category: 'articulation',
                    download_count: 178,
                    created_at: '2023-12-28'
                },
                {
                    id: 7,
                    title: 'Following Directions Activity Pack',
                    description: 'Multi-step direction activities for receptive language practice.',
                    resource_type: 'worksheet',
                    category: 'language',
                    download_count: 234,
                    created_at: '2023-12-20'
                },
                {
                    id: 8,
                    title: 'Phonological Awareness Games',
                    description: 'Interactive game ideas for phonological awareness activities.',
                    resource_type: 'guide',
                    category: 'phonology',
                    download_count: 145,
                    created_at: '2023-12-15'
                }
            ];
        }
        
        // Initialize file input handler after DOM is ready
        var fileInputListener = null;
        function initFileHandler() {
            var fileInput = document.getElementById('resourceFile');
            if (fileInput) {
                // Remove old listener if exists
                if (fileInputListener) {
                    fileInput.removeEventListener('change', fileInputListener);
                }
                // Create new listener
                fileInputListener = function(event) {
                    $scope.handleFileSelect(event);
                };
                fileInput.addEventListener('change', fileInputListener);
            }
        }
        
        // Initialize
        loadLocalResources();
        loadResources();
        
        // Set up file handler after a short delay to ensure DOM is ready
        setTimeout(initFileHandler, 500);
    }
]);
