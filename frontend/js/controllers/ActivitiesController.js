/**
 * SpeechWorks - Activities Controller
 * Handles therapy activities and interactive sessions
 */

app.controller('ActivitiesController', ['$scope', '$rootScope', '$timeout', 'ApiService', 'ToastService',
    function($scope, $rootScope, $timeout, ApiService, ToastService) {
        
        // Initialize data
        $scope.activities = [];
        $scope.clients = [];
        $scope.selectedCategory = '';
        
        // Activity session state
        $scope.showActivitySession = false;
        $scope.selectedActivity = null;
        $scope.activityClient = null;
        $scope.activityWords = [];
        $scope.currentWord = null;
        $scope.currentWordIndex = 0;
        $scope.currentTrial = 0;
        $scope.totalTrials = 10;
        $scope.trialsCorrect = 0;
        
        // Session source tracking (when activity opened from a session)
        $scope.sourceSession = null;
        $scope.sourceSessionActivityRecord = null;
        
        // Load activities
        function loadActivities() {
            var params = {};
            if ($scope.selectedCategory) params.category = $scope.selectedCategory;
            
            ApiService.getActivities(params)
                .then(function(response) {
                    $scope.activities = response.data;
                    // If no activities from API, load sample activities
                    if ($scope.activities.length === 0) {
                        $scope.activities = getSampleActivities();
                    }
                    // Check for pending activity after activities load
                    $timeout(function() {
                        checkPendingActivity();
                    }, 100);
                })
                .catch(function(error) {
                    // Load sample activities if API fails
                    $scope.activities = getSampleActivities();
                    // Check for pending activity after activities load
                    $timeout(function() {
                        checkPendingActivity();
                    }, 100);
                });
        }
        
        // Get sample activities for demo/when API is empty (11 unique activities)
        function getSampleActivities() {
            var samples = [
                {
                    id: 1,
                    name: 'S Sound Practice - Initial Position',
                    description: 'Practice producing the /s/ sound at the beginning of words. Focus on correct tongue placement and airflow.',
                    category: 'ARTICULATION',
                    target_sounds: 's',
                    difficulty_level: 1,
                    instructions: 'Show each word card. Have the client say the word 3 times. Model correct production as needed.'
                },
                {
                    id: 2,
                    name: 'R Sound Practice - Vocalic R',
                    description: 'Target vocalic R sounds including -AR, -ER, -IR, -OR, -UR patterns.',
                    category: 'ARTICULATION',
                    target_sounds: 'r',
                    difficulty_level: 3,
                    instructions: 'Focus on tongue position for vocalic R. Use visual feedback and mirror practice.'
                },
                {
                    id: 3,
                    name: 'L Sound Practice - All Positions',
                    description: 'Comprehensive /l/ sound practice in initial, medial, and final positions.',
                    category: 'ARTICULATION',
                    target_sounds: 'l',
                    difficulty_level: 2,
                    instructions: 'Emphasize tongue tip placement on alveolar ridge. Practice in isolation before words.'
                },
                {
                    id: 4,
                    name: 'TH Sound Discrimination',
                    description: 'Practice voiced and voiceless TH sounds with minimal pairs.',
                    category: 'ARTICULATION',
                    target_sounds: 'th',
                    difficulty_level: 2,
                    instructions: 'Demonstrate tongue placement between teeth. Use mirror for visual feedback.'
                },
                {
                    id: 5,
                    name: 'Naming Common Objects',
                    description: 'Expressive naming activity using everyday objects for word retrieval.',
                    category: 'LANGUAGE',
                    target_sounds: null,
                    difficulty_level: 1,
                    instructions: 'Show pictures and ask "What is this?" Allow 5 seconds for response.'
                },
                {
                    id: 6,
                    name: 'Following Directions',
                    description: 'Receptive language activity with 1-step to 3-step directions.',
                    category: 'LANGUAGE',
                    target_sounds: null,
                    difficulty_level: 2,
                    instructions: 'Start with simple 1-step directions and gradually increase complexity.'
                },
                {
                    id: 7,
                    name: 'Sentence Building',
                    description: 'Create grammatically correct sentences using word cards.',
                    category: 'LANGUAGE',
                    target_sounds: null,
                    difficulty_level: 2,
                    instructions: 'Provide word cards and have client create complete sentences.'
                },
                {
                    id: 8,
                    name: 'Easy Onset & Slow Speech',
                    description: 'Fluency shaping with easy voice onset and reduced speech rate.',
                    category: 'FLUENCY',
                    target_sounds: null,
                    difficulty_level: 2,
                    instructions: 'Model slow, stretched speech with gentle voice onset.'
                },
                {
                    id: 9,
                    name: 'Voice Projection Exercises',
                    description: 'Practice producing voice at appropriate loudness levels.',
                    category: 'VOICE',
                    target_sounds: null,
                    difficulty_level: 1,
                    instructions: 'Practice sustained vowels and reading passages at varying volumes.'
                },
                {
                    id: 10,
                    name: 'Minimal Pairs - Final Consonants',
                    description: 'Phonological awareness targeting final consonant contrasts.',
                    category: 'PHONOLOGY',
                    target_sounds: null,
                    difficulty_level: 2,
                    instructions: 'Present minimal pairs. Have client identify and produce the difference.'
                },
                {
                    id: 11,
                    name: 'Conversation Skills',
                    description: 'Practice initiating and maintaining conversations.',
                    category: 'PRAGMATICS',
                    target_sounds: null,
                    difficulty_level: 2,
                    instructions: 'Role-play conversation scenarios. Practice turn-taking and topic maintenance.'
                }
            ];
            
            // Filter by category if one is selected
            if ($scope.selectedCategory) {
                return samples.filter(function(a) {
                    return a.category.toLowerCase() === $scope.selectedCategory.toLowerCase();
                });
            }
            return samples;
        }
        
        // Load clients
        function loadClients() {
            ApiService.getClients({ is_active: true })
                .then(function(response) {
                    $scope.clients = response.data;
                })
                .catch(function(error) {
                    console.error('Failed to load clients:', error);
                });
        }
        
        // Filter by category
        $scope.filterByCategory = function(category) {
            $scope.selectedCategory = category ? category.toUpperCase() : '';
            loadActivities();
        };
        
        // Select activity to start
        $scope.selectActivity = function(activity) {
            $scope.selectedActivity = activity;
            $scope.activityWords = getActivityWords(activity);
            $scope.activityClient = null;
            $scope.showActivitySession = true;
            resetActivityState();
        };
        
        // Get words for specific activity - matches each activity title
        function getActivityWords(activity) {
            var activityWordLists = {
                // S Sound Practice - Initial Position
                1: [
                    { word: 'sun', phonetic: '/sʌn/', position: 'initial' },
                    { word: 'soap', phonetic: '/soʊp/', position: 'initial' },
                    { word: 'sand', phonetic: '/sænd/', position: 'initial' },
                    { word: 'sock', phonetic: '/sɒk/', position: 'initial' },
                    { word: 'see', phonetic: '/siː/', position: 'initial' },
                    { word: 'seal', phonetic: '/siːl/', position: 'initial' },
                    { word: 'sail', phonetic: '/seɪl/', position: 'initial' },
                    { word: 'sit', phonetic: '/sɪt/', position: 'initial' },
                    { word: 'seven', phonetic: '/ˈsɛvən/', position: 'initial' },
                    { word: 'soup', phonetic: '/suːp/', position: 'initial' }
                ],
                // R Sound Practice - Vocalic R
                2: [
                    { word: 'car', phonetic: '/kɑːr/', position: 'vocalic -AR' },
                    { word: 'star', phonetic: '/stɑːr/', position: 'vocalic -AR' },
                    { word: 'her', phonetic: '/hɜːr/', position: 'vocalic -ER' },
                    { word: 'butter', phonetic: '/ˈbʌtər/', position: 'vocalic -ER' },
                    { word: 'bird', phonetic: '/bɜːrd/', position: 'vocalic -IR' },
                    { word: 'girl', phonetic: '/ɡɜːrl/', position: 'vocalic -IR' },
                    { word: 'door', phonetic: '/dɔːr/', position: 'vocalic -OR' },
                    { word: 'floor', phonetic: '/flɔːr/', position: 'vocalic -OR' },
                    { word: 'fur', phonetic: '/fɜːr/', position: 'vocalic -UR' },
                    { word: 'turn', phonetic: '/tɜːrn/', position: 'vocalic -UR' }
                ],
                // L Sound Practice - All Positions
                3: [
                    { word: 'leaf', phonetic: '/liːf/', position: 'initial' },
                    { word: 'lamp', phonetic: '/læmp/', position: 'initial' },
                    { word: 'lion', phonetic: '/ˈlaɪən/', position: 'initial' },
                    { word: 'yellow', phonetic: '/ˈjeloʊ/', position: 'medial' },
                    { word: 'balloon', phonetic: '/bəˈluːn/', position: 'medial' },
                    { word: 'pillow', phonetic: '/ˈpɪloʊ/', position: 'medial' },
                    { word: 'ball', phonetic: '/bɔːl/', position: 'final' },
                    { word: 'hill', phonetic: '/hɪl/', position: 'final' },
                    { word: 'apple', phonetic: '/ˈæpəl/', position: 'final' },
                    { word: 'blue', phonetic: '/bluː/', position: 'blend' }
                ],
                // TH Sound Discrimination
                4: [
                    { word: 'think', phonetic: '/θɪŋk/', position: 'voiceless' },
                    { word: 'thumb', phonetic: '/θʌm/', position: 'voiceless' },
                    { word: 'three', phonetic: '/θriː/', position: 'voiceless' },
                    { word: 'bath', phonetic: '/bæθ/', position: 'voiceless' },
                    { word: 'this', phonetic: '/ðɪs/', position: 'voiced' },
                    { word: 'that', phonetic: '/ðæt/', position: 'voiced' },
                    { word: 'the', phonetic: '/ðə/', position: 'voiced' },
                    { word: 'mother', phonetic: '/ˈmʌðər/', position: 'voiced' },
                    { word: 'brother', phonetic: '/ˈbrʌðər/', position: 'voiced' },
                    { word: 'weather', phonetic: '/ˈwɛðər/', position: 'voiced' }
                ],
                // Naming Common Objects
                5: [
                    { word: 'chair', phonetic: '/tʃɛr/' },
                    { word: 'table', phonetic: '/ˈteɪbəl/' },
                    { word: 'cup', phonetic: '/kʌp/' },
                    { word: 'spoon', phonetic: '/spuːn/' },
                    { word: 'book', phonetic: '/bʊk/' },
                    { word: 'phone', phonetic: '/foʊn/' },
                    { word: 'clock', phonetic: '/klɒk/' },
                    { word: 'shoe', phonetic: '/ʃuː/' },
                    { word: 'hat', phonetic: '/hæt/' },
                    { word: 'brush', phonetic: '/brʌʃ/' }
                ],
                // Following Directions
                6: [
                    { word: 'Touch your nose', phonetic: '1-step' },
                    { word: 'Clap your hands', phonetic: '1-step' },
                    { word: 'Stand up', phonetic: '1-step' },
                    { word: 'Touch head then sit', phonetic: '2-step' },
                    { word: 'Jump then touch table', phonetic: '2-step' },
                    { word: 'Pick up pencil, put on chair', phonetic: '2-step' },
                    { word: 'Stand, turn, then sit', phonetic: '3-step' },
                    { word: 'Touch red, blue, yellow', phonetic: '3-step' },
                    { word: 'Clap, stomp, wave', phonetic: '3-step' },
                    { word: 'Point door, window, floor', phonetic: '3-step' }
                ],
                // Sentence Building
                7: [
                    { word: 'cat / is / sleeping', phonetic: 'Subject + Verb' },
                    { word: 'dog / runs / fast', phonetic: 'S + V + Adverb' },
                    { word: 'boy / eats / apple', phonetic: 'S + V + Object' },
                    { word: 'girl / has / red ball', phonetic: 'S + V + Adj + O' },
                    { word: 'bird / flies / in sky', phonetic: 'S + V + Prep + O' },
                    { word: 'mom / makes / dinner', phonetic: 'S + V + O' },
                    { word: 'fish / swims / in water', phonetic: 'S + V + Prep + O' },
                    { word: 'baby / is / happy', phonetic: 'S + V + Adj' },
                    { word: 'car / goes / beep', phonetic: 'S + V + Sound' },
                    { word: 'sun / shines / bright', phonetic: 'S + V + Adverb' }
                ],
                // Easy Onset & Slow Speech
                8: [
                    { word: 'eeeasy', phonetic: 'Stretch vowel' },
                    { word: 'aaaand', phonetic: 'Stretch vowel' },
                    { word: 'I... am... fine', phonetic: 'Pause words' },
                    { word: 'Hello... how... are... you', phonetic: 'Slow phrasing' },
                    { word: 'My... name... is...', phonetic: 'Slow phrasing' },
                    { word: 'gentle start', phonetic: 'Easy onset' },
                    { word: 'smooth speech', phonetic: 'Continuous flow' },
                    { word: 'Take... your... time', phonetic: 'Paced speech' },
                    { word: 'One... word... at... a... time', phonetic: 'Slow rate' },
                    { word: 'Breathe... and... speak', phonetic: 'Coordinated' }
                ],
                // Voice Projection Exercises
                9: [
                    { word: 'Ahhhh', phonetic: 'Sustained /ɑː/' },
                    { word: 'Eeeee', phonetic: 'Sustained /iː/' },
                    { word: 'Ooooh', phonetic: 'Sustained /oʊ/' },
                    { word: 'Hello! (loud)', phonetic: 'Project voice' },
                    { word: 'Hello. (soft)', phonetic: 'Quiet voice' },
                    { word: '1-2-3-4-5', phonetic: 'Count louder' },
                    { word: 'HEY!', phonetic: 'Call out' },
                    { word: 'Good morning everyone', phonetic: 'Project' },
                    { word: 'Can you hear me?', phonetic: 'Check volume' },
                    { word: 'La-la-la-la-la', phonetic: 'Pitch vary' }
                ],
                // Minimal Pairs - Final Consonants
                10: [
                    { word: 'bow / boat', phonetic: 'Final /t/' },
                    { word: 'bee / bead', phonetic: 'Final /d/' },
                    { word: 'key / keep', phonetic: 'Final /p/' },
                    { word: 'row / rope', phonetic: 'Final /p/' },
                    { word: 'see / seat', phonetic: 'Final /t/' },
                    { word: 'go / goat', phonetic: 'Final /t/' },
                    { word: 'tie / tight', phonetic: 'Final /t/' },
                    { word: 'pie / pipe', phonetic: 'Final /p/' },
                    { word: 'tea / team', phonetic: 'Final /m/' },
                    { word: 'day / date', phonetic: 'Final /t/' }
                ],
                // Conversation Skills
                11: [
                    { word: 'Hi, how are you?', phonetic: 'Greeting' },
                    { word: 'What is your name?', phonetic: 'Introduction' },
                    { word: 'Nice to meet you!', phonetic: 'Polite response' },
                    { word: 'What do you like?', phonetic: 'Ask interest' },
                    { word: 'That sounds fun!', phonetic: 'Show interest' },
                    { word: 'Tell me more', phonetic: 'Continue topic' },
                    { word: 'I like that too!', phonetic: 'Common ground' },
                    { word: 'What else?', phonetic: 'Keep going' },
                    { word: 'That is cool!', phonetic: 'Enthusiasm' },
                    { word: 'See you later!', phonetic: 'Closing' }
                ]
            };
            
            // Return activity-specific words or fallback by category
            if (activityWordLists[activity.id]) {
                return activityWordLists[activity.id];
            }
            
            // Fallback to category-based defaults
            var cat = (activity.category || 'articulation').toLowerCase();
            var categoryDefaults = {
                'articulation': activityWordLists[1],
                'language': activityWordLists[5],
                'fluency': activityWordLists[8],
                'voice': activityWordLists[9],
                'phonology': activityWordLists[10],
                'pragmatics': activityWordLists[11]
            };
            
            return categoryDefaults[cat] || activityWordLists[1];
        }
        
        // Close activity session
        $scope.closeActivitySession = function() {
            $scope.showActivitySession = false;
            $scope.selectedActivity = null;
            $scope.activityClient = null;
            $scope.sourceSession = null;
            $scope.sourceSessionActivityRecord = null;
            resetActivityState();
        };
        
        // Select client for activity
        $scope.selectActivityClient = function(client) {
            $scope.activityClient = client;
            resetActivityState();
            startActivity();
        };
        
        // Reset activity state
        function resetActivityState() {
            $scope.currentWordIndex = 0;
            $scope.currentTrial = 0;
            $scope.trialsCorrect = 0;
            $scope.currentWord = null;
        }
        
        // Start activity
        function startActivity() {
            $scope.totalTrials = Math.min($scope.activityWords.length, 10);
            shuffleWords();
            nextWord();
        }
        
        // Shuffle words array
        function shuffleWords() {
            for (var i = $scope.activityWords.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = $scope.activityWords[i];
                $scope.activityWords[i] = $scope.activityWords[j];
                $scope.activityWords[j] = temp;
            }
        }
        
        // Show next word
        function nextWord() {
            if ($scope.currentWordIndex < $scope.activityWords.length && 
                $scope.currentTrial < $scope.totalTrials) {
                $scope.currentWord = $scope.activityWords[$scope.currentWordIndex];
                $scope.currentWordIndex++;
            } else {
                // Activity complete
                $scope.currentWord = null;
            }
        }
        
        // Record response - stop at max trials
        $scope.recordResponse = function(isCorrect) {
            // Don't allow going past max trials
            if ($scope.currentTrial >= $scope.totalTrials) {
                return;
            }
            
            $scope.currentTrial++;
            if (isCorrect) {
                $scope.trialsCorrect++;
            }
            
            if ($scope.currentTrial < $scope.totalTrials) {
                nextWord();
            } else {
                // Activity complete - show results
                $scope.currentWord = null;
            }
        };
        
        // Reset activity
        $scope.resetActivity = function() {
            resetActivityState();
            startActivity();
        };
        
        // Finish and save activity results
        $scope.finishActivity = function() {
            if (!$scope.activityClient || $scope.currentTrial === 0) {
                $scope.closeActivitySession();
                return;
            }
            
            var accuracy = ($scope.trialsCorrect / $scope.currentTrial) * 100;
            
            // Create progress record - category must be lowercase to match backend enum
            var progressData = {
                client_id: $scope.activityClient.id,
                record_date: new Date().toISOString().split('T')[0],
                category: $scope.selectedActivity.category.toLowerCase(),
                accuracy_percentage: accuracy,
                trials_total: $scope.currentTrial,
                notes: 'Activity: ' + $scope.selectedActivity.name + 
                       '. Trials: ' + $scope.currentTrial + 
                       ', Correct: ' + $scope.trialsCorrect
            };
            
            // Store session info before closing
            var sourceSession = $scope.sourceSession;
            var sourceSessionActivityRecord = $scope.sourceSessionActivityRecord;
            
            console.log('finishActivity called, sourceSession:', sourceSession);
            
            ApiService.createProgressRecord(progressData)
                .then(function(response) {
                    // If we have a session activity record, update it with results
                    if (sourceSession && sourceSessionActivityRecord) {
                        var updateData = {
                            trials_attempted: $scope.currentTrial,
                            trials_correct: $scope.trialsCorrect,
                            notes: 'Completed. Accuracy: ' + accuracy.toFixed(1) + '%'
                        };
                        
                        ApiService.updateSessionActivity(sourceSession.id, sourceSessionActivityRecord.id, updateData)
                            .catch(function(err) {
                                console.error('Failed to update session activity:', err);
                            });
                    }
                    
                    ToastService.success('Activity completed! Accuracy: ' + accuracy.toFixed(1) + '%');
                    $scope.closeActivitySession();
                    
                    // Navigate back to sessions if opened from session
                    if (sourceSession) {
                        console.log('Navigating back to sessions...');
                        $timeout(function() {
                            // Store session ID to reload data
                            $rootScope.returnToSessionId = sourceSession.id;
                            if ($scope.$parent && $scope.$parent.setView) {
                                $scope.$parent.setView('sessions');
                            } else {
                                $scope.$parent.currentView = 'sessions';
                            }
                        }, 500);
                    }
                })
                .catch(function(error) {
                    console.error('Failed to save progress:', error);
                    ToastService.info('Activity completed! Accuracy: ' + accuracy.toFixed(1) + '% (Results not saved)');
                    $scope.closeActivitySession();
                    
                    // Still navigate back to sessions if opened from session
                    if (sourceSession) {
                        console.log('Navigating back to sessions (after error)...');
                        $timeout(function() {
                            $rootScope.returnToSessionId = sourceSession.id;
                            if ($scope.$parent && $scope.$parent.setView) {
                                $scope.$parent.setView('sessions');
                            } else {
                                $scope.$parent.currentView = 'sessions';
                            }
                        }, 500);
                    }
                });
        };
        
        // Listen for activity open request from Sessions tab
        $scope.$on('openActivityWithClient', function(event, data) {
            // If activities not loaded yet, wait and try again
            if ($scope.activities.length === 0) {
                $timeout(function() {
                    openActivityForClient(data.activityId, data.client, data.session, data.sessionActivityRecord);
                }, 500);
                return;
            }
            
            openActivityForClient(data.activityId, data.client, data.session, data.sessionActivityRecord);
        });
        
        // Helper function to open activity with client
        function openActivityForClient(activityId, client, session, sessionActivityRecord) {
            // Find the activity by ID
            var activity = null;
            for (var i = 0; i < $scope.activities.length; i++) {
                if ($scope.activities[i].id == activityId) {
                    activity = $scope.activities[i];
                    break;
                }
            }
            
            if (activity && client) {
                // Store source session info for navigation after completion
                $scope.sourceSession = session || null;
                $scope.sourceSessionActivityRecord = sessionActivityRecord || null;
                
                // Open the activity
                $scope.selectedActivity = activity;
                $scope.activityWords = getActivityWords(activity);
                $scope.showActivitySession = true;
                resetActivityState();
                
                // Pre-select the client
                $scope.activityClient = client;
                startActivity();
                
                // Clear pending activity if set
                $rootScope.pendingActivity = null;
                
                ToastService.success('Activity started for ' + client.first_name + ' ' + client.last_name);
            }
        }
        
        // Check for pending activity on initialization
        function checkPendingActivity() {
            console.log('checkPendingActivity called, pendingActivity:', $rootScope.pendingActivity, 'activities count:', $scope.activities.length);
            
            if ($rootScope.pendingActivity && $scope.activities.length > 0) {
                var pending = $rootScope.pendingActivity;
                
                // Find the activity by ID
                var activity = null;
                for (var i = 0; i < $scope.activities.length; i++) {
                    if ($scope.activities[i].id == pending.activity.id) {
                        activity = $scope.activities[i];
                        break;
                    }
                }
                
                console.log('Found activity:', activity);
                
                if (activity && pending.client) {
                    console.log('Opening activity for client:', pending.client.first_name);
                    
                    // Store source session info for navigation after completion
                    $scope.sourceSession = pending.session || null;
                    $scope.sourceSessionActivityRecord = pending.sessionActivityRecord || null;
                    
                    // Open the activity
                    $scope.selectedActivity = activity;
                    $scope.activityWords = getActivityWords(activity);
                    $scope.showActivitySession = true;
                    resetActivityState();
                    
                    // Pre-select the client
                    $scope.activityClient = pending.client;
                    startActivity();
                    
                    // Clear pending activity
                    $rootScope.pendingActivity = null;
                    
                    ToastService.success('Activity started for ' + pending.client.first_name + ' ' + pending.client.last_name);
                }
            }
        }
        
        // Watch for pendingActivity changes on $rootScope
        $scope.$watch(function() {
            return $rootScope.pendingActivity;
        }, function(newVal, oldVal) {
            console.log('$watch pendingActivity triggered, newVal:', newVal, 'activities:', $scope.activities.length);
            if (newVal && $scope.activities.length > 0) {
                checkPendingActivity();
            } else if (newVal && $scope.activities.length === 0) {
                // Activities not loaded yet, wait
                console.log('Activities not loaded yet, will retry...');
            }
        });
        
        // Initialize
        loadActivities();
        loadClients();
        
        // Multiple checks for pending activity with increasing delays
        $timeout(function() { 
            console.log('Delayed check 300ms');
            checkPendingActivity(); 
        }, 300);
        $timeout(function() { 
            console.log('Delayed check 600ms');
            checkPendingActivity(); 
        }, 600);
        $timeout(function() { 
            console.log('Delayed check 1000ms');
            checkPendingActivity(); 
        }, 1000);
        $timeout(function() { 
            console.log('Delayed check 1500ms');
            checkPendingActivity(); 
        }, 1500);
    }
]);
