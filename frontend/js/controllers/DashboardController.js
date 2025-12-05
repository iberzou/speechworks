/**
 * SpeechWorks - Dashboard Controller
 * Handles dashboard statistics and today's sessions
 */

app.controller('DashboardController', ['$scope', 'ApiService', 'ToastService',
    function($scope, ApiService, ToastService) {
        
        // Initialize data
        $scope.stats = {
            total_clients: 0,
            active_sessions_today: 0,
            sessions_this_week: 0,
            avg_accuracy_this_week: 0
        };
        $scope.todaySessions = [];
        $scope.clients = [];
        
        // Load dashboard stats
        function loadStats() {
            ApiService.getDashboardStats()
                .then(function(response) {
                    $scope.stats = response.data;
                })
                .catch(function(error) {
                    console.error('Failed to load stats:', error);
                    // Use default stats if API fails
                });
        }
        
        // Load today's sessions
        function loadTodaySessions() {
            ApiService.getTodaySessions()
                .then(function(response) {
                    var sessions = response.data;
                    var now = new Date();
                    
                    // Sort by proximity to current time (closest first, then going back)
                    sessions.sort(function(a, b) {
                        var timeA = new Date(a.session_date);
                        var timeB = new Date(b.session_date);
                        var diffA = Math.abs(now - timeA);
                        var diffB = Math.abs(now - timeB);
                        return diffA - diffB;
                    });
                    
                    $scope.todaySessions = sessions;
                })
                .catch(function(error) {
                    console.error('Failed to load today sessions:', error);
                });
        }
        
        // Load clients for name lookup
        function loadClients() {
            ApiService.getClients()
                .then(function(response) {
                    $scope.clients = response.data;
                })
                .catch(function(error) {
                    console.error('Failed to load clients:', error);
                });
        }
        
        // Get client name by ID
        $scope.getClientName = function(clientId) {
            var client = $scope.clients.find(function(c) { return c.id === clientId; });
            return client ? client.first_name + ' ' + client.last_name : 'Unknown Client';
        };
        
        // Override parent's getClientName
        $scope.$parent.getClientName = $scope.getClientName;
        
        // Start session
        $scope.startSession = function(session) {
            ApiService.startSession(session.id)
                .then(function(response) {
                    session.status = 'in_progress';
                    ToastService.success('Session started!');
                })
                .catch(function(error) {
                    ToastService.error('Failed to start session');
                });
        };
        
        // Complete session
        $scope.completeSession = function(session) {
            ApiService.completeSession(session.id)
                .then(function(response) {
                    session.status = 'completed';
                    ToastService.success('Session completed!');
                })
                .catch(function(error) {
                    ToastService.error('Failed to complete session');
                });
        };
        
        // Quick actions
        $scope.openNewClientModal = function() {
            $scope.$broadcast('openClientModal');
        };
        
        $scope.openNewSessionModal = function() {
            $scope.$broadcast('openSessionModal');
        };
        
        // Initialize
        loadStats();
        loadTodaySessions();
        loadClients();
    }
]);
