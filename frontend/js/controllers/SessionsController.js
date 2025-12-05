/**
 * SpeechWorks - Sessions Controller
 * Handles therapy session management and SOAP notes
 */

app.controller('SessionsController', ['$scope', '$rootScope', '$timeout', '$interval', 'ApiService', 'ToastService',
    function($scope, $rootScope, $timeout, $interval, ApiService, ToastService) {
        
        // Initialize data
        $scope.sessions = [];
        $scope.clients = [];
        $scope.allClients = []; // Store all clients including inactive for name lookup
        $scope.availableActivities = []; // All activities for assignment
        $scope.sessionActivities = []; // Activities assigned to current session
        $scope.selectedActivityId = ''; // Selected activity to add
        
        // Status check interval
        var statusCheckInterval = null;
        
        // Filters
        $scope.filterClient = '';
        $scope.filterStatus = '';
        $scope.filterDate = null;
        
        // Modal state
        $scope.showSessionModal = false;
        $scope.showSessionDetail = false;
        $scope.editingSession = null;
        $scope.sessionForm = {};
        $scope.selectedSession = null;
        
        // Store original session date for persistence
        var originalSessionDate = null;
        
        // Session statuses (lowercase to match backend enum)
        $scope.sessionStatuses = [
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
        ];
        
        // Load sessions
        function loadSessions() {
            var params = {};
            if ($scope.filterClient) params.client_id = $scope.filterClient;
            if ($scope.filterStatus) params.status = $scope.filterStatus;
            if ($scope.filterDate) params.start_date = formatDateForAPI($scope.filterDate);
            
            ApiService.getSessions(params)
                .then(function(response) {
                    $scope.sessions = response.data;
                    // Load activities for each session and check status
                    $scope.sessions.forEach(function(session) {
                        loadSessionActivitiesForCard(session);
                    });
                    // Start status check interval
                    startStatusCheckInterval();
                })
                .catch(function(error) {
                    ToastService.error('Failed to load sessions');
                });
        }
        
        // Load clients (active only for dropdown)
        function loadClients() {
            ApiService.getClients({ is_active: true })
                .then(function(response) {
                    $scope.clients = response.data;
                })
                .catch(function(error) {
                    console.error('Failed to load clients:', error);
                });
        }
        
        // Load all clients (for name lookup including deleted)
        function loadAllClients() {
            ApiService.getClients({})
                .then(function(response) {
                    $scope.allClients = response.data;
                    console.log('All clients loaded:', $scope.allClients.length);
                })
                .catch(function(error) {
                    console.error('Failed to load all clients:', error);
                });
        }
        
        // Load available activities
        function loadAvailableActivities(callback) {
            ApiService.getActivities({})
                .then(function(response) {
                    $scope.availableActivities = response.data;
                    // If no activities from API, load sample activities
                    if ($scope.availableActivities.length === 0) {
                        $scope.availableActivities = getSampleActivities();
                    }
                    if (callback) callback();
                })
                .catch(function(error) {
                    console.error('Failed to load activities:', error);
                    // Load sample activities if API fails
                    $scope.availableActivities = getSampleActivities();
                    if (callback) callback();
                });
        }
        
        // Get sample activities (same as ActivitiesController)
        function getSampleActivities() {
            return [
                {
                    id: 1,
                    name: 'S Sound Practice - Initial Position',
                    description: 'Practice producing the /s/ sound at the beginning of words.',
                    category: 'articulation',
                    difficulty_level: 1
                },
                {
                    id: 2,
                    name: 'R Sound Practice - Vocalic R',
                    description: 'Target vocalic R sounds including -AR, -ER, -IR, -OR, -UR patterns.',
                    category: 'articulation',
                    difficulty_level: 3
                },
                {
                    id: 3,
                    name: 'L Sound Practice - All Positions',
                    description: 'Comprehensive /l/ sound practice in initial, medial, and final positions.',
                    category: 'articulation',
                    difficulty_level: 2
                },
                {
                    id: 4,
                    name: 'TH Sound Discrimination',
                    description: 'Practice voiced and voiceless TH sounds with minimal pairs.',
                    category: 'articulation',
                    difficulty_level: 2
                },
                {
                    id: 5,
                    name: 'Naming Common Objects',
                    description: 'Expressive naming activity using everyday objects.',
                    category: 'language',
                    difficulty_level: 1
                },
                {
                    id: 6,
                    name: 'Following Directions',
                    description: 'Receptive language activity with 1-step to 3-step directions.',
                    category: 'language',
                    difficulty_level: 2
                },
                {
                    id: 7,
                    name: 'Sentence Building',
                    description: 'Create grammatically correct sentences using word cards.',
                    category: 'language',
                    difficulty_level: 2
                },
                {
                    id: 8,
                    name: 'Easy Onset & Slow Speech',
                    description: 'Fluency shaping with easy voice onset and reduced speech rate.',
                    category: 'fluency',
                    difficulty_level: 2
                },
                {
                    id: 9,
                    name: 'Voice Projection Exercises',
                    description: 'Practice producing voice at appropriate loudness levels.',
                    category: 'voice',
                    difficulty_level: 1
                },
                {
                    id: 10,
                    name: 'Minimal Pairs - Final Consonants',
                    description: 'Phonological awareness targeting final consonant contrasts.',
                    category: 'phonology',
                    difficulty_level: 2
                },
                {
                    id: 11,
                    name: 'Conversation Skills',
                    description: 'Practice initiating and maintaining conversations.',
                    category: 'pragmatics',
                    difficulty_level: 2
                }
            ];
        }
        
        // Load activities for a session (for card display)
        function loadSessionActivitiesForCard(session) {
            ApiService.getSessionActivities(session.id)
                .then(function(response) {
                    session.assignedActivities = response.data;
                    // Populate activity info from local samples if not returned by API
                    session.assignedActivities.forEach(function(sa) {
                        if (!sa.activity || !sa.activity.name) {
                            var localActivity = $scope.availableActivities.find(function(a) {
                                return a.id == sa.activity_id;
                            });
                            if (localActivity) {
                                sa.activity = {
                                    id: localActivity.id,
                                    name: localActivity.name,
                                    category: localActivity.category
                                };
                            } else {
                                sa.activity = {
                                    id: sa.activity_id,
                                    name: 'Activity #' + sa.activity_id,
                                    category: 'unknown'
                                };
                            }
                        }
                    });
                    
                    // Immediately check if session should be auto-completed
                    checkSessionAutoComplete(session);
                })
                .catch(function(error) {
                    session.assignedActivities = [];
                });
        }
        
        // Check if a single session should be auto-completed (all activities done)
        function checkSessionAutoComplete(session) {
            if (session.status === 'in_progress' && session.assignedActivities && session.assignedActivities.length > 0) {
                var allCompleted = true;
                for (var i = 0; i < session.assignedActivities.length; i++) {
                    if (!session.assignedActivities[i].trials_attempted || session.assignedActivities[i].trials_attempted === 0) {
                        allCompleted = false;
                        break;
                    }
                }
                
                if (allCompleted) {
                    updateSessionStatus(session, 'completed', 'All activities complete! Session marked as complete.');
                }
            }
        }
        
        // Load activities for selected session (for detail view)
        function loadSessionActivities(sessionId) {
            ApiService.getSessionActivities(sessionId)
                .then(function(response) {
                    $scope.sessionActivities = response.data;
                    // Populate activity info from local samples if not returned by API
                    $scope.sessionActivities.forEach(function(sa) {
                        if (!sa.activity || !sa.activity.name) {
                            var localActivity = $scope.availableActivities.find(function(a) {
                                return a.id == sa.activity_id;
                            });
                            if (localActivity) {
                                sa.activity = {
                                    id: localActivity.id,
                                    name: localActivity.name,
                                    category: localActivity.category
                                };
                            } else {
                                sa.activity = {
                                    id: sa.activity_id,
                                    name: 'Activity #' + sa.activity_id,
                                    category: 'unknown'
                                };
                            }
                        }
                    });
                })
                .catch(function(error) {
                    console.error('Failed to load session activities:', error);
                    $scope.sessionActivities = [];
                });
        }
        
        // Add activity to session
        $scope.addActivityToSession = function() {
            if (!$scope.selectedActivityId || !$scope.selectedSession) {
                return;
            }
            
            // Check if already added
            var alreadyAdded = $scope.sessionActivities.some(function(sa) {
                return sa.activity_id == $scope.selectedActivityId;
            });
            
            if (alreadyAdded) {
                ToastService.warning('This activity is already assigned to this session');
                return;
            }
            
            // Find the activity details
            var selectedActivity = $scope.availableActivities.find(function(a) {
                return a.id == $scope.selectedActivityId;
            });
            
            var activityData = {
                activity_id: parseInt($scope.selectedActivityId),
                trials_attempted: 0,
                trials_correct: 0,
                notes: ''
            };
            
            ApiService.addSessionActivity($scope.selectedSession.id, activityData)
                .then(function(response) {
                    var newSessionActivity = response.data;
                    // Ensure activity info is populated
                    if (!newSessionActivity.activity || !newSessionActivity.activity.name) {
                        newSessionActivity.activity = {
                            id: selectedActivity.id,
                            name: selectedActivity.name,
                            category: selectedActivity.category
                        };
                    }
                    $scope.sessionActivities.push(newSessionActivity);
                    $scope.selectedActivityId = '';
                    ToastService.success('Activity assigned to session');
                })
                .catch(function(error) {
                    console.error('Failed to add activity:', error);
                    ToastService.error('Failed to assign activity');
                });
        };
        
        // Remove activity from session
        $scope.removeActivityFromSession = function(sessionActivity) {
            if (!confirm('Remove this activity from the session?')) {
                return;
            }
            
            ApiService.removeSessionActivity($scope.selectedSession.id, sessionActivity.id)
                .then(function(response) {
                    var index = $scope.sessionActivities.indexOf(sessionActivity);
                    if (index > -1) {
                        $scope.sessionActivities.splice(index, 1);
                    }
                    ToastService.success('Activity removed from session');
                })
                .catch(function(error) {
                    console.error('Failed to remove activity:', error);
                    ToastService.error('Failed to remove activity');
                });
        };
        
        // Get activity name by ID
        $scope.getActivityName = function(activityId) {
            var activity = $scope.availableActivities.find(function(a) {
                return a.id == activityId;
            });
            return activity ? activity.name : 'Activity #' + activityId;
        };
        
        // Helper to check if session is in progress
        $scope.isInProgress = function(session) {
            if (!session || !session.status) return false;
            var status = session.status.toLowerCase().replace(/[_\s]/g, '');
            return status === 'inprogress';
        };
        
        // Check if session has incomplete activities
        $scope.hasIncompleteActivities = function(session) {
            if (!session.assignedActivities || session.assignedActivities.length === 0) {
                return false;
            }
            for (var i = 0; i < session.assignedActivities.length; i++) {
                if (!session.assignedActivities[i].trials_attempted || session.assignedActivities[i].trials_attempted === 0) {
                    return true;
                }
            }
            return false;
        };
        
        // Open activity from session card (navigate to Activities tab and start activity)
        $scope.openActivityFromSession = function(activity, session, sessionActivityRecord) {
            console.log('openActivityFromSession called', activity, session);
            
            // Only allow when session is in progress
            if (!$scope.isInProgress(session)) {
                ToastService.info('Session must be "In Progress" to start activities');
                return;
            }
            
            // Check if activity is already completed
            if (sessionActivityRecord && sessionActivityRecord.trials_attempted > 0) {
                ToastService.info('This activity has already been completed (' + 
                    (sessionActivityRecord.accuracy_percentage || 0).toFixed(0) + '% accuracy)');
                return;
            }
            
            // Find the client for this session
            var client = null;
            for (var i = 0; i < $scope.allClients.length; i++) {
                if ($scope.allClients[i].id == session.client_id) {
                    client = $scope.allClients[i];
                    break;
                }
            }
            if (!client) {
                for (var j = 0; j < $scope.clients.length; j++) {
                    if ($scope.clients[j].id == session.client_id) {
                        client = $scope.clients[j];
                        break;
                    }
                }
            }
            
            if (!client) {
                ToastService.error('Could not find client for this session');
                return;
            }
            
            console.log('Client found:', client);
            
            // Find session activity record if not passed
            var saRecord = sessionActivityRecord;
            if (!saRecord && session.assignedActivities) {
                for (var k = 0; k < session.assignedActivities.length; k++) {
                    var sa = session.assignedActivities[k];
                    if (sa.activity_id == activity.id || (sa.activity && sa.activity.id == activity.id)) {
                        saRecord = sa;
                        break;
                    }
                }
            }
            
            // Store activity, client, and session info for ActivitiesController
            $rootScope.pendingActivity = {
                activity: activity,
                client: client,
                session: session,
                sessionActivityRecord: saRecord
            };
            
            console.log('pendingActivity set on $rootScope:', $rootScope.pendingActivity);
            
            // Navigate to Activities view using $timeout to ensure digest cycle completes
            $timeout(function() {
                console.log('Navigating to activities view...');
                if ($scope.$parent && $scope.$parent.setView) {
                    $scope.$parent.setView('activities');
                } else {
                    $scope.$parent.currentView = 'activities';
                }
            }, 0);
        };
        
        // Check and auto-update session statuses (only auto-complete when all activities done)
        function checkSessionStatuses() {
            $scope.sessions.forEach(function(session) {
                // Auto-complete: Check if all activities are completed for in_progress sessions
                if (session.status === 'in_progress' && session.assignedActivities && session.assignedActivities.length > 0) {
                    var allCompleted = true;
                    for (var i = 0; i < session.assignedActivities.length; i++) {
                        if (!session.assignedActivities[i].trials_attempted || session.assignedActivities[i].trials_attempted === 0) {
                            allCompleted = false;
                            break;
                        }
                    }
                    
                    if (allCompleted) {
                        updateSessionStatus(session, 'completed', 'All activities completed! Session marked as complete.');
                    }
                }
            });
        }
        
        // Update session status via API
        function updateSessionStatus(session, newStatus, message) {
            ApiService.updateSession(session.id, { status: newStatus })
                .then(function(response) {
                    session.status = newStatus;
                    if (message) {
                        ToastService.success(message);
                    }
                })
                .catch(function(error) {
                    console.error('Failed to update session status:', error);
                });
        }
        
        // Start status check interval (every 30 seconds)
        function startStatusCheckInterval() {
            if (statusCheckInterval) return;
            
            // Check immediately
            checkSessionStatuses();
            
            // Then check every 30 seconds
            statusCheckInterval = $interval(function() {
                checkSessionStatuses();
            }, 30000);
        }
        
        // Stop status check interval
        function stopStatusCheckInterval() {
            if (statusCheckInterval) {
                $interval.cancel(statusCheckInterval);
                statusCheckInterval = null;
            }
        }
        
        // Cleanup on scope destroy
        $scope.$on('$destroy', function() {
            stopStatusCheckInterval();
        });
        
        // Watch for return from activity completion
        $scope.$watch(function() {
            return $rootScope.returnToSessionId;
        }, function(sessionId) {
            if (sessionId) {
                // Reload sessions to get updated activity data
                loadSessions();
                // Clear the return flag
                $rootScope.returnToSessionId = null;
                ToastService.info('Returned to session');
            }
        });
        
        // Filter sessions
        $scope.filterSessions = function() {
            loadSessions();
        };
        
        // Get client name - handle deleted clients
        $scope.getClientName = function(clientId) {
            // First check active clients
            var client = $scope.clients.find(function(c) { return c.id == clientId; });
            if (client) {
                return client.first_name + ' ' + client.last_name;
            }
            // Check all clients (including inactive)
            client = $scope.allClients.find(function(c) { return c.id == clientId; });
            if (client) {
                return client.first_name + ' ' + client.last_name + ' (Inactive)';
            }
            return 'Client #' + clientId;
        };
        
        // Override parent's getClientName
        $scope.$parent.getClientName = $scope.getClientName;
        
        // Open session modal for new session
        $scope.openSessionModal = function() {
            $scope.editingSession = null;
            originalSessionDate = null;
            $scope.sessionForm = {
                client_id: '',
                session_date: '',
                duration_minutes: '30',
                status: 'scheduled'
            };
            $scope.showSessionModal = true;
        };
        
        // Close session modal
        $scope.closeSessionModal = function() {
            $scope.showSessionModal = false;
            $scope.sessionForm = {};
            $scope.editingSession = null;
            originalSessionDate = null;
        };
        
        // Save session
        $scope.saveSession = function() {
            if ($scope.editingSession) {
                // Validate status change to in_progress
                if ($scope.sessionForm.status === 'in_progress' && $scope.editingSession.status !== 'in_progress') {
                    // Get session date/time - handle both string and Date object
                    var sessionDateValue = $scope.sessionForm.session_date || originalSessionDate || $scope.editingSession.session_date;
                    var sessionDate = new Date(sessionDateValue);
                    var sessionEndTime = new Date(sessionDate.getTime() + (parseInt($scope.sessionForm.duration_minutes) * 60 * 1000));
                    var now = new Date();
                    
                    // Check if current time is within session window (session start to session end)
                    if (now < sessionDate || now > sessionEndTime) {
                        var sessionTimeStr = sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        ToastService.error('Cannot start session - session time (' + sessionTimeStr + ') does not match current time');
                        return;
                    }
                }
                
                // Update existing session - don't send client_id (can't change client)
                var updateData = {
                    duration_minutes: parseInt($scope.sessionForm.duration_minutes)
                };
                
                // Handle session_date - convert to ISO with timezone
                if ($scope.sessionForm.session_date) {
                    updateData.session_date = convertLocalDateTimeToISO($scope.sessionForm.session_date);
                } else if (originalSessionDate) {
                    updateData.session_date = originalSessionDate;
                }
                
                // Include status
                if ($scope.sessionForm.status) {
                    updateData.status = $scope.sessionForm.status;
                }
                
                console.log('Updating session with data:', updateData);
                
                ApiService.updateSession($scope.editingSession.id, updateData)
                    .then(function(response) {
                        ToastService.success('Session updated');
                        $scope.closeSessionModal();
                        loadSessions();
                    })
                    .catch(function(error) {
                        console.error('Update error:', error);
                        ToastService.error('Failed to update session: ' + (error.data?.detail || 'Unknown error'));
                    });
            } else {
                // Create new session - convert datetime-local to ISO
                var sessionData = {
                    client_id: parseInt($scope.sessionForm.client_id),
                    duration_minutes: parseInt($scope.sessionForm.duration_minutes),
                    session_date: convertLocalDateTimeToISO($scope.sessionForm.session_date)
                };
                
                console.log('Creating session with data:', sessionData);
                
                ApiService.createSession(sessionData)
                    .then(function(response) {
                        ToastService.success('Session scheduled');
                        $scope.closeSessionModal();
                        loadSessions();
                    })
                    .catch(function(error) {
                        console.error('Create error:', error);
                        ToastService.error('Failed to create session');
                    });
            }
        };
        
        // View session details (SOAP notes)
        $scope.viewSession = function(session) {
            $scope.selectedSession = angular.copy(session);
            $scope.sessionActivities = [];
            $scope.selectedActivityId = '';
            loadSessionActivities(session.id);
            $scope.showSessionDetail = true;
        };
        
        // Close session detail
        $scope.closeSessionDetail = function() {
            $scope.showSessionDetail = false;
            $scope.selectedSession = null;
            $scope.sessionActivities = [];
            $scope.selectedActivityId = '';
        };
        
        // Edit session - properly format datetime
        $scope.editSession = function(session) {
            $scope.editingSession = session;
            
            // Store original session date for persistence
            originalSessionDate = session.session_date;
            
            // Format datetime for datetime-local input
            var dateStr = '';
            if (session.session_date) {
                dateStr = formatDateTimeForInput(session.session_date);
            }
            
            $scope.sessionForm = {
                client_id: session.client_id.toString(),
                session_date: dateStr,
                duration_minutes: session.duration_minutes.toString(),
                status: session.status || 'scheduled'
            };
            
            // Log for debugging
            console.log('Editing session:', session);
            console.log('Formatted date:', dateStr);
            console.log('Session form:', $scope.sessionForm);
            
            $scope.showSessionModal = true;
        };
        
        // Change session status directly
        $scope.changeSessionStatus = function(session, newStatus) {
            var updateData = { status: newStatus };
            ApiService.updateSession(session.id, updateData)
                .then(function(response) {
                    ToastService.success('Status updated to ' + newStatus);
                    loadSessions();
                })
                .catch(function(error) {
                    ToastService.error('Failed to update status');
                });
        };
        
        // Delete session
        $scope.deleteSession = function(session) {
            if (confirm('Are you sure you want to cancel this session?')) {
                ApiService.deleteSession(session.id)
                    .then(function(response) {
                        ToastService.success('Session cancelled');
                        loadSessions();
                    })
                    .catch(function(error) {
                        ToastService.error('Failed to cancel session');
                    });
            }
        };
        
        // Start session
        $scope.startSession = function(session) {
            ApiService.startSession(session.id)
                .then(function(response) {
                    ToastService.success('Session started!');
                    loadSessions();
                })
                .catch(function(error) {
                    ToastService.error('Failed to start session');
                });
        };
        
        // Complete session
        $scope.completeSession = function(session) {
            ApiService.completeSession(session.id)
                .then(function(response) {
                    ToastService.success('Session completed!');
                    loadSessions();
                })
                .catch(function(error) {
                    ToastService.error('Failed to complete session');
                });
        };
        
        // Update session notes (SOAP)
        $scope.updateSessionNotes = function() {
            var updateData = {
                session_notes: $scope.selectedSession.session_notes,
                soap_subjective: $scope.selectedSession.soap_subjective,
                soap_objective: $scope.selectedSession.soap_objective,
                soap_assessment: $scope.selectedSession.soap_assessment,
                soap_plan: $scope.selectedSession.soap_plan
            };
            
            ApiService.updateSession($scope.selectedSession.id, updateData)
                .then(function(response) {
                    ToastService.success('Notes saved successfully');
                    $scope.closeSessionDetail();
                    loadSessions();
                })
                .catch(function(error) {
                    ToastService.error('Failed to save notes');
                });
        };
        
        // Helper: Format date for API (YYYY-MM-DD)
        function formatDateForAPI(dateInput) {
            if (!dateInput) return null;
            var d = new Date(dateInput);
            if (isNaN(d.getTime())) return null;
            return d.getFullYear() + '-' + 
                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(d.getDate()).padStart(2, '0');
        }
        
        // Helper: Convert datetime-local string to ISO format WITH timezone offset (preserves local time)
        function convertLocalDateTimeToISO(dateTimeLocal) {
            if (!dateTimeLocal) return null;
            
            try {
                // datetime-local format is "YYYY-MM-DDTHH:MM"
                if (typeof dateTimeLocal === 'string') {
                    // If it's already an ISO string with timezone, return as-is
                    if (dateTimeLocal.includes('Z') || dateTimeLocal.includes('+') || dateTimeLocal.includes('-', 10)) {
                        return dateTimeLocal;
                    }
                    
                    // Parse the local datetime
                    var d = new Date(dateTimeLocal);
                    if (!isNaN(d.getTime())) {
                        // Get timezone offset in minutes and convert to hours:minutes
                        var tzOffset = -d.getTimezoneOffset();
                        var tzSign = tzOffset >= 0 ? '+' : '-';
                        var tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
                        var tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
                        
                        // Build ISO string with timezone offset
                        var year = d.getFullYear();
                        var month = String(d.getMonth() + 1).padStart(2, '0');
                        var day = String(d.getDate()).padStart(2, '0');
                        var hours = String(d.getHours()).padStart(2, '0');
                        var minutes = String(d.getMinutes()).padStart(2, '0');
                        var seconds = String(d.getSeconds()).padStart(2, '0');
                        
                        return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + tzSign + tzHours + ':' + tzMins;
                    }
                }
                
                if (dateTimeLocal instanceof Date && !isNaN(dateTimeLocal.getTime())) {
                    var d = dateTimeLocal;
                    var tzOffset = -d.getTimezoneOffset();
                    var tzSign = tzOffset >= 0 ? '+' : '-';
                    var tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
                    var tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
                    
                    var year = d.getFullYear();
                    var month = String(d.getMonth() + 1).padStart(2, '0');
                    var day = String(d.getDate()).padStart(2, '0');
                    var hours = String(d.getHours()).padStart(2, '0');
                    var minutes = String(d.getMinutes()).padStart(2, '0');
                    var seconds = String(d.getSeconds()).padStart(2, '0');
                    
                    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + tzSign + tzHours + ':' + tzMins;
                }
            } catch (e) {
                console.error('Error converting date:', e);
            }
            
            return dateTimeLocal;
        }
        
        // Helper: Format datetime for input[type="datetime-local"]
        function formatDateTimeForInput(dateInput) {
            if (!dateInput) return '';
            
            try {
                // Handle string input
                if (typeof dateInput === 'string') {
                    // If already in the correct format for datetime-local (YYYY-MM-DDTHH:MM)
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateInput)) {
                        return dateInput;
                    }
                    
                    // Parse the string into a Date object
                    var d = new Date(dateInput);
                    if (!isNaN(d.getTime())) {
                        // Use local date/time components
                        var year = d.getFullYear();
                        var month = String(d.getMonth() + 1).padStart(2, '0');
                        var day = String(d.getDate()).padStart(2, '0');
                        var hours = String(d.getHours()).padStart(2, '0');
                        var minutes = String(d.getMinutes()).padStart(2, '0');
                        return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                    }
                }
                
                // Handle Date object
                if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
                    var year = dateInput.getFullYear();
                    var month = String(dateInput.getMonth() + 1).padStart(2, '0');
                    var day = String(dateInput.getDate()).padStart(2, '0');
                    var hours = String(dateInput.getHours()).padStart(2, '0');
                    var minutes = String(dateInput.getMinutes()).padStart(2, '0');
                    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
            
            return '';
        }
        
        // Listen for broadcast to open modal
        $scope.$on('openSessionModal', function() {
            $scope.openSessionModal();
        });
        
        // Initialize - load activities first, then sessions (for card display)
        loadClients();
        loadAllClients();
        loadAvailableActivities(function() {
            loadSessions();
        });
    }
]);
