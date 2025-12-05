/**
 * SpeechWorks - Clients Controller
 * Handles client management and treatment goals
 */

app.controller('ClientsController', ['$scope', '$timeout', 'ApiService', 'ToastService',
    function($scope, $timeout, ApiService, ToastService) {
        
        // Initialize data
        $scope.clients = [];
        $scope.searchTerm = '';
        $scope.filterActive = '';
        
        // Helper hint - auto-hide after 5 seconds
        $scope.showClientHint = true;
        $timeout(function() {
            $scope.showClientHint = false;
        }, 5000);
        
        // Modal state
        $scope.showClientModal = false;
        $scope.showClientDetail = false;
        $scope.editingClient = null;
        $scope.clientForm = {};
        $scope.selectedClient = null;
        $scope.clientTab = 'info';
        
        // Goal modal state
        $scope.showGoalModal = false;
        $scope.goalForm = {};
        $scope.editingGoal = null;
        
        // Goal statuses
        $scope.goalStatuses = [
            { value: 'not_started', label: 'Not Started' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'mastered', label: 'Mastered' },
            { value: 'discontinued', label: 'Discontinued' }
        ];
        
        // Client progress data
        $scope.clientProgress = {
            completedSessions: 0,
            masteredGoals: 0,
            totalGoals: 0,
            avgAccuracy: 0
        };
        
        // Client activities (progress records)
        $scope.clientActivities = [];
        
        // Store original DOB to preserve it during edits
        var originalDOB = null;
        
        // Goal categories (lowercase to match backend enum)
        $scope.goalCategories = [
            { value: 'articulation', label: 'Articulation' },
            { value: 'language', label: 'Language' },
            { value: 'fluency', label: 'Fluency' },
            { value: 'voice', label: 'Voice' },
            { value: 'pragmatics', label: 'Pragmatics' },
            { value: 'phonology', label: 'Phonology' }
        ];
        
        // Load clients
        function loadClients() {
            var params = {};
            if ($scope.searchTerm) params.search = $scope.searchTerm;
            if ($scope.filterActive !== '') params.is_active = $scope.filterActive;
            
            ApiService.getClients(params)
                .then(function(response) {
                    $scope.clients = response.data;
                })
                .catch(function(error) {
                    ToastService.error('Failed to load clients');
                });
        }
        
        // Search clients
        $scope.searchClients = function() {
            loadClients();
        };
        
        // Filter clients
        $scope.filterClients = function() {
            loadClients();
        };
        
        // Open client modal for new client
        $scope.openClientModal = function() {
            $scope.editingClient = null;
            originalDOB = null;
            $scope.clientForm = {
                first_name: '',
                last_name: '',
                date_of_birth: '',
                diagnosis: '',
                guardian_name: '',
                contact_phone: '',
                contact_email: '',
                notes: '',
                is_active: true
            };
            $scope.showClientModal = true;
        };
        
        // Close client modal
        $scope.closeClientModal = function() {
            $scope.showClientModal = false;
            $scope.clientForm = {};
            $scope.editingClient = null;
            originalDOB = null;
        };
        
        // Save client (create or update)
        $scope.saveClient = function() {
            console.log('saveClient called');
            console.log('clientForm:', $scope.clientForm);
            console.log('editingClient:', $scope.editingClient);
            
            // Format date for API
            var clientData = angular.copy($scope.clientForm);
            
            // Handle date_of_birth - could be string, Date, or empty
            if (clientData.date_of_birth) {
                // If it's a Date object, convert to string
                if (clientData.date_of_birth instanceof Date) {
                    clientData.date_of_birth = formatDateForAPI(clientData.date_of_birth);
                } else if (typeof clientData.date_of_birth === 'string' && clientData.date_of_birth.trim() !== '') {
                    clientData.date_of_birth = formatDateForAPI(clientData.date_of_birth);
                } else {
                    // Empty or invalid - use original if editing
                    clientData.date_of_birth = originalDOB || null;
                }
            } else if (originalDOB) {
                // No date provided but we have original - use it
                clientData.date_of_birth = originalDOB;
            }
            
            console.log('Final clientData:', clientData);
            
            if ($scope.editingClient) {
                console.log('Updating client ID:', $scope.editingClient.id);
                ApiService.updateClient($scope.editingClient.id, clientData)
                    .then(function(response) {
                        console.log('Update success:', response);
                        ToastService.success('Client updated successfully');
                        $scope.closeClientModal();
                        loadClients();
                    })
                    .catch(function(error) {
                        console.error('Update error:', error);
                        ToastService.error('Failed to update client: ' + (error.data?.detail || 'Unknown error'));
                    });
            } else {
                console.log('Creating new client');
                ApiService.createClient(clientData)
                    .then(function(response) {
                        console.log('Create success:', response);
                        ToastService.success('Client created successfully');
                        $scope.closeClientModal();
                        loadClients();
                    })
                    .catch(function(error) {
                        console.error('Create error:', error);
                        ToastService.error('Failed to create client: ' + (error.data?.detail || 'Unknown error'));
                    });
            }
        };
        
        // View client details
        $scope.viewClient = function(client, tab) {
            ApiService.getClient(client.id)
                .then(function(response) {
                    $scope.selectedClient = response.data;
                    $scope.clientTab = tab || 'info';
                    $scope.showClientDetail = true;
                    
                    // Calculate progress stats from goals
                    calculateProgressStats(response.data);
                    
                    // Load completed sessions count for this client
                    loadClientSessions(client.id);
                    
                    // Load client activity history
                    loadClientActivities(client.id);
                })
                .catch(function(error) {
                    ToastService.error('Failed to load client details');
                });
        };
        
        // Refresh client data while staying on current tab
        function refreshClientData() {
            if ($scope.selectedClient) {
                var currentTab = $scope.clientTab;
                ApiService.getClient($scope.selectedClient.id)
                    .then(function(response) {
                        $scope.selectedClient = response.data;
                        $scope.clientTab = currentTab;
                        calculateProgressStats(response.data);
                        loadClientSessions($scope.selectedClient.id);
                        loadClientActivities($scope.selectedClient.id);
                    });
            }
        }
        
        // Calculate progress stats from client goals
        function calculateProgressStats(clientData) {
            var goals = clientData.goals || [];
            var totalGoals = goals.length;
            var masteredGoals = 0;
            var totalAccuracy = 0;
            
            goals.forEach(function(goal) {
                if (goal.status === 'mastered') {
                    masteredGoals++;
                }
                totalAccuracy += goal.current_accuracy || 0;
            });
            
            $scope.clientProgress.totalGoals = totalGoals;
            $scope.clientProgress.masteredGoals = masteredGoals;
            $scope.clientProgress.avgAccuracy = totalGoals > 0 ? Math.round(totalAccuracy / totalGoals) : 0;
        }
        
        // Load completed sessions for client
        function loadClientSessions(clientId) {
            ApiService.getSessions({ client_id: clientId, status: 'completed' })
                .then(function(response) {
                    $scope.clientProgress.completedSessions = response.data.length;
                })
                .catch(function(error) {
                    $scope.clientProgress.completedSessions = 0;
                });
        }
        
        // Load client activities (progress records)
        function loadClientActivities(clientId) {
            console.log('Loading activities for client:', clientId);
            ApiService.getClientProgress(clientId)
                .then(function(response) {
                    console.log('Client activities loaded:', response.data);
                    $scope.clientActivities = response.data;
                })
                .catch(function(error) {
                    console.error('Failed to load client activities:', error);
                    $scope.clientActivities = [];
                });
        }
        
        // Close client detail
        $scope.closeClientDetail = function() {
            $scope.showClientDetail = false;
            $scope.selectedClient = null;
            $scope.clientActivities = [];
        };
        
        // Edit client - properly format date for input[type="date"]
        $scope.editClient = function(client) {
            $scope.editingClient = client;
            
            // Store original DOB for persistence
            originalDOB = client.date_of_birth;
            
            // Format date as YYYY-MM-DD string for input[type="date"]
            var dobString = '';
            if (client.date_of_birth) {
                dobString = formatDateForInput(client.date_of_birth);
            }
            
            $scope.clientForm = {
                first_name: client.first_name || '',
                last_name: client.last_name || '',
                date_of_birth: dobString,
                diagnosis: client.diagnosis || '',
                guardian_name: client.guardian_name || '',
                contact_phone: client.contact_phone || '',
                contact_email: client.contact_email || '',
                notes: client.notes || '',
                is_active: client.is_active !== false
            };
            
            $scope.showClientDetail = false;
            $scope.showClientModal = true;
        };
        
        // Delete client
        $scope.deleteClient = function(client) {
            if (confirm('Are you sure you want to deactivate this client?')) {
                ApiService.deleteClient(client.id)
                    .then(function(response) {
                        ToastService.success('Client deactivated');
                        $scope.closeClientDetail();
                        $scope.closeClientModal();
                        loadClients();
                    })
                    .catch(function(error) {
                        ToastService.error('Failed to delete client');
                    });
            }
        };
        
        // Open goal modal - can be called from edit form or client detail
        $scope.openGoalModal = function() {
            // If we're in edit mode without a selectedClient, set it from editingClient
            if (!$scope.selectedClient && $scope.editingClient) {
                $scope.selectedClient = $scope.editingClient;
            }
            
            if (!$scope.selectedClient && !$scope.editingClient) {
                ToastService.error('Please save the client first before adding goals');
                return;
            }
            
            $scope.goalForm = {
                category: 'articulation',
                description: '',
                target_accuracy: 80,
                target_date: ''
            };
            $scope.showGoalModal = true;
        };
        
        // Close goal modal
        $scope.closeGoalModal = function() {
            $scope.showGoalModal = false;
            $scope.goalForm = {};
            $scope.editingGoal = null;
            $scope.originalGoalStatus = null;
            $scope.originalCurrentAccuracy = null;
            $scope.statusChangedToInProgress = false;
            $scope.accuracyModified = false;
        };
        
        // Save goal
        $scope.saveGoal = function() {
            if (!$scope.goalForm.description) {
                ToastService.error('Please enter a goal description');
                return;
            }
            
            // Determine which client to use
            var clientForGoal = $scope.selectedClient || $scope.editingClient;
            
            if (!clientForGoal || !clientForGoal.id) {
                ToastService.error('Please save the client first before adding goals');
                return;
            }
            
            var goalData = {
                category: $scope.goalForm.category,
                description: $scope.goalForm.description,
                target_accuracy: parseInt($scope.goalForm.target_accuracy) || 80,
                target_date: $scope.goalForm.target_date ? formatDateForAPI($scope.goalForm.target_date) : null
            };
            
            ApiService.createGoal(clientForGoal.id, goalData)
                .then(function(response) {
                    ToastService.success('Goal created successfully');
                    $scope.closeGoalModal();
                    // Stay on goals tab
                    refreshClientData();
                })
                .catch(function(error) {
                    ToastService.error('Failed to create goal');
                });
        };
        
        // Track state for validation
        $scope.originalGoalStatus = null;
        $scope.originalCurrentAccuracy = null;
        $scope.statusChangedToInProgress = false;
        $scope.accuracyModified = false;
        
        // Edit goal - open modal with existing data
        $scope.editGoal = function(goal) {
            $scope.editingGoal = goal;
            $scope.originalGoalStatus = goal.status;
            $scope.originalCurrentAccuracy = goal.current_accuracy;
            $scope.statusChangedToInProgress = false;
            $scope.accuracyModified = false;
            
            $scope.goalForm = {
                category: goal.category,
                description: goal.description,
                target_accuracy: goal.target_accuracy,
                current_accuracy: goal.current_accuracy,
                status: goal.status,
                target_date: goal.target_date ? formatDateForInput(goal.target_date) : ''
            };
            $scope.showGoalModal = true;
        };
        
        // Track when current accuracy is changed by user
        $scope.onCurrentAccuracyChange = function() {
            $scope.accuracyModified = true;
        };
        
        // Check if there's an accuracy error
        $scope.hasAccuracyError = function() {
            if ($scope.goalForm.status !== 'in_progress') return false;
            
            var current = $scope.goalForm.current_accuracy;
            var target = $scope.goalForm.target_accuracy;
            
            // Check if current >= target (must use mastered status)
            if (current !== null && current !== undefined && current !== '' && current >= target) {
                return true;
            }
            
            return false;
        };
        
        // Check if goal can be saved
        $scope.canSaveGoal = function() {
            // For new goals (not editing), just check description
            if (!$scope.editingGoal) {
                return $scope.goalForm.description && $scope.goalForm.description.trim() !== '';
            }
            
            // For editing goals
            var current = $scope.goalForm.current_accuracy;
            var target = $scope.goalForm.target_accuracy;
            var status = $scope.goalForm.status;
            
            // Basic validation - must have description
            if (!$scope.goalForm.description || $scope.goalForm.description.trim() === '') {
                return false;
            }
            
            // Current accuracy cannot exceed target
            if (current !== null && current !== undefined && current !== '' && current > target) {
                return false;
            }
            
            // If status is in_progress
            if (status === 'in_progress') {
                // Must have current accuracy entered
                if (current === null || current === undefined || current === '') {
                    return false;
                }
                
                // Current accuracy cannot equal or exceed target (must change to mastered)
                if (current >= target) {
                    return false;
                }
                
                // If status was changed to in_progress, must modify accuracy
                if ($scope.statusChangedToInProgress && !$scope.accuracyModified) {
                    return false;
                }
            }
            
            return true;
        };
        
        // Handle status change in goal form
        $scope.onGoalStatusChange = function() {
            switch ($scope.goalForm.status) {
                case 'mastered':
                    // Auto-set current accuracy to target accuracy
                    $scope.goalForm.current_accuracy = $scope.goalForm.target_accuracy;
                    $scope.statusChangedToInProgress = false;
                    break;
                case 'not_started':
                    // Reset current accuracy to 0
                    $scope.goalForm.current_accuracy = 0;
                    $scope.statusChangedToInProgress = false;
                    break;
                case 'discontinued':
                    // Keep current value but field will be disabled
                    $scope.statusChangedToInProgress = false;
                    break;
                case 'in_progress':
                    // Track if changed to in_progress from another status
                    if ($scope.originalGoalStatus !== 'in_progress') {
                        $scope.statusChangedToInProgress = true;
                        $scope.accuracyModified = false;
                    }
                    break;
            }
        };
        
        // Update goal
        $scope.updateGoal = function() {
            if (!$scope.goalForm.description) {
                ToastService.error('Please enter a goal description');
                return;
            }
            
            var current = $scope.goalForm.current_accuracy;
            var target = $scope.goalForm.target_accuracy;
            
            // Validate current accuracy for in_progress status
            if ($scope.goalForm.status === 'in_progress') {
                if (current === null || current === undefined || current === '') {
                    ToastService.error('Current accuracy is required when status is "In Progress"');
                    return;
                }
                
                // Cannot have current accuracy equal to target for in_progress
                if (parseInt(current) >= parseInt(target)) {
                    ToastService.error('To set current accuracy equal to target, change status to "Mastered"');
                    return;
                }
                
                // If status was changed to in_progress, must modify accuracy
                if ($scope.statusChangedToInProgress && !$scope.accuracyModified) {
                    ToastService.error('Please enter a new current accuracy value');
                    return;
                }
            }
            
            // Current accuracy cannot exceed target accuracy
            if (current !== null && current !== undefined && current !== '' && parseInt(current) > parseInt(target)) {
                ToastService.error('Current accuracy cannot exceed target accuracy');
                return;
            }
            
            var clientForGoal = $scope.selectedClient || $scope.editingClient;
            
            if (!clientForGoal || !clientForGoal.id || !$scope.editingGoal) {
                ToastService.error('Unable to update goal');
                return;
            }
            
            // Determine current accuracy based on status
            var currentAccuracy = parseInt($scope.goalForm.current_accuracy) || 0;
            switch ($scope.goalForm.status) {
                case 'mastered':
                    currentAccuracy = parseInt($scope.goalForm.target_accuracy) || 80;
                    break;
                case 'not_started':
                    currentAccuracy = 0;
                    break;
                case 'discontinued':
                    // Keep existing value
                    currentAccuracy = parseInt($scope.goalForm.current_accuracy) || 0;
                    break;
                case 'in_progress':
                    // Use user-entered value
                    currentAccuracy = parseInt($scope.goalForm.current_accuracy) || 0;
                    break;
            }
            
            var goalData = {
                description: $scope.goalForm.description,
                target_accuracy: parseInt($scope.goalForm.target_accuracy) || 80,
                current_accuracy: currentAccuracy,
                status: $scope.goalForm.status,
                target_date: $scope.goalForm.target_date ? formatDateForAPI($scope.goalForm.target_date) : null
            };
            
            ApiService.updateGoal(clientForGoal.id, $scope.editingGoal.id, goalData)
                .then(function(response) {
                    ToastService.success('Goal updated successfully');
                    $scope.closeGoalModal();
                    $scope.editingGoal = null;
                    // Stay on goals tab
                    refreshClientData();
                })
                .catch(function(error) {
                    ToastService.error('Failed to update goal');
                });
        };
        
        // Delete goal
        $scope.deleteGoal = function(goal) {
            if (!confirm('Are you sure you want to delete this goal?')) {
                return;
            }
            
            var clientForGoal = $scope.selectedClient || $scope.editingClient;
            
            if (!clientForGoal || !clientForGoal.id) {
                ToastService.error('Unable to delete goal');
                return;
            }
            
            ApiService.deleteGoal(clientForGoal.id, goal.id)
                .then(function(response) {
                    ToastService.success('Goal deleted');
                    // Stay on goals tab
                    refreshClientData();
                })
                .catch(function(error) {
                    ToastService.error('Failed to delete goal');
                });
        };
        
        // Save goal (create or update)
        $scope.saveGoalForm = function() {
            if ($scope.editingGoal) {
                $scope.updateGoal();
            } else {
                $scope.saveGoal();
            }
        };
        
        // Helper function to format date for API (YYYY-MM-DD)
        function formatDateForAPI(dateInput) {
            if (!dateInput) return null;
            // If already a string in correct format, return it
            if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                return dateInput;
            }
            // If ISO format with time, extract just the date
            if (typeof dateInput === 'string' && dateInput.includes('T')) {
                return dateInput.split('T')[0];
            }
            var d = new Date(dateInput);
            if (isNaN(d.getTime())) return null;
            return d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
        }
        
        // Helper function to format date for input[type="date"] (YYYY-MM-DD string)
        function formatDateForInput(dateInput) {
            if (!dateInput) return '';
            // Handle ISO date string from API
            if (typeof dateInput === 'string') {
                // If already in YYYY-MM-DD format
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                    return dateInput;
                }
                // If ISO format with time, extract just the date
                if (dateInput.includes('T')) {
                    return dateInput.split('T')[0];
                }
                // Try to parse other formats
                var d = new Date(dateInput);
                if (!isNaN(d.getTime())) {
                    return d.getFullYear() + '-' + 
                           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(d.getDate()).padStart(2, '0');
                }
            }
            // Handle Date object
            if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
                return dateInput.getFullYear() + '-' + 
                       String(dateInput.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(dateInput.getDate()).padStart(2, '0');
            }
            return '';
        }
        
        // Get client name
        $scope.getClientName = function(clientId) {
            var client = $scope.clients.find(function(c) { return c.id === clientId; });
            return client ? client.first_name + ' ' + client.last_name : 'Unknown Client';
        };
        
        // Listen for broadcast to open modal
        $scope.$on('openClientModal', function() {
            $scope.openClientModal();
        });
        
        // Initialize
        loadClients();
    }
]);
