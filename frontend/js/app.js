/**
 * SpeechWorks - Speech Therapy Treatment Tool
 * Main AngularJS Application Module
 */

// Create main application module
var app = angular.module('speechWorksApp', []);

// API Base URL Configuration
app.constant('API_BASE_URL', 'http://localhost:8000/api');

// HTTP Interceptor for Authentication
app.factory('authInterceptor', ['$q', '$window', function($q, $window) {
    return {
        request: function(config) {
            var token = $window.localStorage.getItem('speechworks_token');
            if (token) {
                config.headers.Authorization = 'Bearer ' + token;
            }
            return config;
        },
        responseError: function(response) {
            if (response.status === 401) {
                $window.localStorage.removeItem('speechworks_token');
                $window.localStorage.removeItem('speechworks_user');
                $window.location.reload();
            }
            return $q.reject(response);
        }
    };
}]);

// Configure HTTP provider
app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
}]);

// API Service
app.factory('ApiService', ['$http', '$q', 'API_BASE_URL', function($http, $q, API_BASE_URL) {
    return {
        // Authentication
        login: function(email, password) {
            var formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            return $http.post(API_BASE_URL + '/auth/login', formData, {
                headers: { 'Content-Type': undefined }
            });
        },
        
        loginJson: function(email, password) {
            return $http.post(API_BASE_URL + '/auth/login/json', {
                email: email,
                password: password
            });
        },
        
        register: function(userData) {
            return $http.post(API_BASE_URL + '/auth/register', userData);
        },
        
        getCurrentUser: function() {
            return $http.get(API_BASE_URL + '/auth/me');
        },
        
        // Clients
        getClients: function(params) {
            return $http.get(API_BASE_URL + '/clients', { params: params });
        },
        
        getClient: function(id) {
            return $http.get(API_BASE_URL + '/clients/' + id);
        },
        
        createClient: function(clientData) {
            return $http.post(API_BASE_URL + '/clients', clientData);
        },
        
        updateClient: function(id, clientData) {
            return $http.put(API_BASE_URL + '/clients/' + id, clientData);
        },
        
        deleteClient: function(id) {
            return $http.delete(API_BASE_URL + '/clients/' + id);
        },
        
        // Goals
        getClientGoals: function(clientId) {
            return $http.get(API_BASE_URL + '/clients/' + clientId + '/goals');
        },
        
        createGoal: function(clientId, goalData) {
            return $http.post(API_BASE_URL + '/clients/' + clientId + '/goals', goalData);
        },
        
        updateGoal: function(clientId, goalId, goalData) {
            return $http.put(API_BASE_URL + '/clients/' + clientId + '/goals/' + goalId, goalData);
        },
        
        deleteGoal: function(clientId, goalId) {
            return $http.delete(API_BASE_URL + '/clients/' + clientId + '/goals/' + goalId);
        },
        
        // Sessions
        getSessions: function(params) {
            return $http.get(API_BASE_URL + '/sessions', { params: params });
        },
        
        getTodaySessions: function() {
            return $http.get(API_BASE_URL + '/sessions/today');
        },
        
        getUpcomingSessions: function(days) {
            return $http.get(API_BASE_URL + '/sessions/upcoming', { params: { days: days || 7 } });
        },
        
        getSession: function(id) {
            return $http.get(API_BASE_URL + '/sessions/' + id);
        },
        
        createSession: function(sessionData) {
            return $http.post(API_BASE_URL + '/sessions', sessionData);
        },
        
        updateSession: function(id, sessionData) {
            return $http.put(API_BASE_URL + '/sessions/' + id, sessionData);
        },
        
        startSession: function(id) {
            return $http.post(API_BASE_URL + '/sessions/' + id + '/start');
        },
        
        completeSession: function(id) {
            return $http.post(API_BASE_URL + '/sessions/' + id + '/complete');
        },
        
        deleteSession: function(id) {
            return $http.delete(API_BASE_URL + '/sessions/' + id);
        },
        
        // Session Activities
        getSessionActivities: function(sessionId) {
            return $http.get(API_BASE_URL + '/sessions/' + sessionId + '/activities');
        },
        
        addSessionActivity: function(sessionId, activityData) {
            return $http.post(API_BASE_URL + '/sessions/' + sessionId + '/activities', activityData);
        },
        
        updateSessionActivity: function(sessionId, activityRecordId, updateData) {
            return $http.put(API_BASE_URL + '/sessions/' + sessionId + '/activities/' + activityRecordId, updateData);
        },
        
        removeSessionActivity: function(sessionId, activityRecordId) {
            return $http.delete(API_BASE_URL + '/sessions/' + sessionId + '/activities/' + activityRecordId);
        },
        
        // Activities
        getActivities: function(params) {
            return $http.get(API_BASE_URL + '/activities', { params: params });
        },
        
        getActivity: function(id) {
            return $http.get(API_BASE_URL + '/activities/' + id);
        },
        
        getActivityWords: function(activityId) {
            return $http.get(API_BASE_URL + '/activities/' + activityId + '/words');
        },
        
        // Progress
        getDashboardStats: function() {
            return $http.get(API_BASE_URL + '/progress/dashboard');
        },
        
        getClientProgress: function(clientId, params) {
            return $http.get(API_BASE_URL + '/progress/client/' + clientId, { params: params });
        },
        
        getClientProgressChart: function(clientId, category, days) {
            return $http.get(API_BASE_URL + '/progress/client/' + clientId + '/chart', {
                params: { category: category, days: days || 30 }
            });
        },
        
        createProgressRecord: function(progressData) {
            return $http.post(API_BASE_URL + '/progress', progressData);
        },
        
        // Resources
        getResources: function(params) {
            return $http.get(API_BASE_URL + '/resources', { params: params });
        },
        
        createResource: function(resourceData) {
            return $http.post(API_BASE_URL + '/resources', resourceData);
        },
        
        downloadResource: function(id) {
            return $http.get(API_BASE_URL + '/resources/' + id + '/download');
        }
    };
}]);

// Toast Notification Service
app.factory('ToastService', ['$timeout', function($timeout) {
    var toasts = [];
    
    return {
        toasts: toasts,
        
        show: function(message, type) {
            var toast = {
                message: message,
                type: type || 'info',
                id: Date.now()
            };
            toasts.push(toast);
            
            $timeout(function() {
                var index = toasts.indexOf(toast);
                if (index > -1) {
                    toasts.splice(index, 1);
                }
            }, 4000);
        },
        
        success: function(message) {
            this.show(message, 'success');
        },
        
        error: function(message) {
            this.show(message, 'error');
        },
        
        info: function(message) {
            this.show(message, 'info');
        }
    };
}]);

// Date Filter
app.filter('date', function() {
    return function(input, format) {
        if (!input) return '';
        var date = new Date(input);
        
        var formats = {
            'shortTime': date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            'mediumDate': date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
            'medium': date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            'd': date.getDate().toString(),
            'MMM': date.toLocaleDateString([], { month: 'short' })
        };
        
        return formats[format] || date.toLocaleString();
    };
});
