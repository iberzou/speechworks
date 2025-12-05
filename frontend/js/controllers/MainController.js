/**
 * SpeechWorks - Main Controller
 * Handles authentication, navigation, and global state
 */

app.controller('MainController', ['$scope', '$window', '$timeout', 'ApiService', 'ToastService',
    function($scope, $window, $timeout, ApiService, ToastService) {
        
        // Initialize state
        $scope.isAuthenticated = false;
        $scope.currentUser = null;
        $scope.currentView = 'dashboard';
        $scope.isLoading = false;
        $scope.globalLoading = false;
        $scope.toasts = ToastService.toasts;
        
        // Login data
        $scope.loginData = { email: '', password: '' };
        $scope.loginError = '';
        $scope.registrationSuccess = '';
        
        // Register data
        $scope.showRegister = false;
        $scope.registerData = { full_name: '', email: '', password: '', license_number: '' };
        $scope.registerError = '';
        
        // Toggle functions for switching between login and register
        $scope.switchToLogin = function() {
            $scope.showRegister = false;
            $scope.registerError = '';
        };
        
        $scope.switchToRegister = function() {
            $scope.showRegister = true;
            $scope.loginError = '';
            $scope.registrationSuccess = '';
        };
        
        // Check for existing authentication
        function checkAuth() {
            var token = $window.localStorage.getItem('speechworks_token');
            var user = $window.localStorage.getItem('speechworks_user');
            
            if (token && user) {
                try {
                    $scope.currentUser = JSON.parse(user);
                    $scope.isAuthenticated = true;
                } catch (e) {
                    logout();
                }
            }
        }
        
        // Login function
        $scope.login = function() {
            $scope.isLoading = true;
            $scope.loginError = '';
            $scope.registrationSuccess = '';
            
            ApiService.loginJson($scope.loginData.email, $scope.loginData.password)
                .then(function(response) {
                    var data = response.data;
                    
                    // Store token and user
                    $window.localStorage.setItem('speechworks_token', data.access_token);
                    $window.localStorage.setItem('speechworks_user', JSON.stringify(data.user));
                    
                    $scope.currentUser = data.user;
                    $scope.isAuthenticated = true;
                    $scope.currentView = 'dashboard';
                    
                    ToastService.success('Welcome back, ' + data.user.full_name + '!');
                })
                .catch(function(error) {
                    if (error.data && error.data.detail) {
                        $scope.loginError = error.data.detail;
                    } else {
                        $scope.loginError = 'Login failed. Please check your credentials.';
                    }
                })
                .finally(function() {
                    $scope.isLoading = false;
                });
        };
        
        // Register function
        $scope.register = function() {
            $scope.isLoading = true;
            $scope.registerError = '';
            
            if ($scope.registerData.password.length < 8) {
                $scope.registerError = 'Password must be at least 8 characters';
                $scope.isLoading = false;
                return;
            }
            
            ApiService.register($scope.registerData)
                .then(function(response) {
                    var registeredEmail = $scope.registerData.email;
                    
                    // Reset register form
                    $scope.registerData = { full_name: '', email: '', password: '', license_number: '' };
                    
                    // Show success message on login page
                    $scope.registrationSuccess = 'Account created successfully! Please sign in.';
                    
                    // Pre-fill login with registered email
                    $scope.loginData.email = registeredEmail;
                    $scope.loginData.password = '';
                    
                    // Switch to login view
                    $scope.showRegister = false;
                    
                    // Show toast notification
                    ToastService.success('Account created! Please sign in with your credentials.');
                    
                    // Use timeout to ensure DOM is updated before focusing
                    $timeout(function() {
                        // Focus on password field for quick login
                        var passwordInput = document.getElementById('password');
                        if (passwordInput) {
                            passwordInput.focus();
                        }
                    }, 300);
                })
                .catch(function(error) {
                    if (error.data && error.data.detail) {
                        $scope.registerError = error.data.detail;
                    } else {
                        $scope.registerError = 'Registration failed. Please try again.';
                    }
                })
                .finally(function() {
                    $scope.isLoading = false;
                });
        };
        
        // Logout function
        $scope.logout = function() {
            $window.localStorage.removeItem('speechworks_token');
            $window.localStorage.removeItem('speechworks_user');
            $scope.isAuthenticated = false;
            $scope.currentUser = null;
            $scope.currentView = 'dashboard';
            $scope.loginData = { email: '', password: '' };
            $scope.registrationSuccess = '';
            ToastService.info('You have been logged out.');
        };
        
        // Navigation
        $scope.setView = function(view) {
            $scope.currentView = view;
        };
        
        // Helper for getting client name
        $scope.getClientName = function(clientId) {
            // This will be overridden in child controllers
            return 'Client #' + clientId;
        };
        
        // Initialize
        checkAuth();
    }
]);
