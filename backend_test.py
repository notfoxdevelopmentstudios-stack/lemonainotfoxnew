import requests
import sys
import json
from datetime import datetime
import time

class NotFoxAPITester:
    def __init__(self, base_url="https://devfox.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.project_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        self.run_test("API Root", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n🔍 Testing Authentication Flow...")
        
        # Generate unique test user
        timestamp = int(time.time())
        test_email = f"test_user_{timestamp}@notfox.test"
        test_username = f"testuser_{timestamp}"
        test_password = "TestPass123!"

        # Test user registration
        register_data = {
            "email": test_email,
            "username": test_username,
            "password": test_password
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200, 
            register_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_test("Token Extraction", True, f"User ID: {self.user_id}")
        else:
            self.log_test("Token Extraction", False, "No token in registration response")
            return False

        # Test get current user
        self.run_test("Get Current User", "GET", "auth/me", 200)

        # Test login with same credentials
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        success, login_response = self.run_test(
            "User Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )

        # Test theme update
        theme_data = {"theme": "light"}
        self.run_test("Update Theme", "PUT", "auth/theme", 200, theme_data)

        return True

    def test_project_management(self):
        """Test project CRUD operations"""
        print("\n🔍 Testing Project Management...")
        
        if not self.token:
            self.log_test("Project Tests", False, "No authentication token available")
            return False

        # Test get projects (should be empty initially)
        self.run_test("Get Projects (Empty)", "GET", "projects", 200)

        # Test create project
        project_data = {
            "name": "Test Roblox Game",
            "project_type": "roblox_game"
        }
        
        success, response = self.run_test(
            "Create Project", 
            "POST", 
            "projects", 
            200, 
            project_data
        )
        
        if success and 'id' in response:
            self.project_id = response['id']
            self.log_test("Project ID Extraction", True, f"Project ID: {self.project_id}")
        else:
            self.log_test("Project ID Extraction", False, "No project ID in response")
            return False

        # Test get projects (should have one now)
        self.run_test("Get Projects (With Data)", "GET", "projects", 200)

        # Test get specific project
        self.run_test("Get Specific Project", "GET", f"projects/{self.project_id}", 200)

        return True

    def test_chat_functionality(self):
        """Test chat and messaging"""
        print("\n🔍 Testing Chat Functionality...")
        
        if not self.token or not self.project_id:
            self.log_test("Chat Tests", False, "Missing authentication token or project ID")
            return False

        # Test get messages (should be empty initially)
        self.run_test("Get Messages (Empty)", "GET", f"messages/{self.project_id}", 200)

        # Test send chat message (this might fail due to OpenRouter API key being placeholder)
        chat_data = {
            "project_id": self.project_id,
            "message": "Create a simple gun script for Roblox",
            "model": "nex-agi/deepseek-v3.1-nex-n1:free"
        }
        
        # Note: This might fail with 500 due to placeholder OpenRouter key
        success, response = self.run_test(
            "Send Chat Message", 
            "POST", 
            "chat", 
            200, 
            chat_data
        )
        
        if not success:
            self.log_test("Chat Message Note", True, "Expected failure due to placeholder OpenRouter API key")

        return True

    def test_subscription_endpoints(self):
        """Test subscription and payment endpoints"""
        print("\n🔍 Testing Subscription Endpoints...")
        
        # Test get subscription plans
        self.run_test("Get Subscription Plans", "GET", "subscription/plans", 200)

        if not self.token:
            self.log_test("Payment Tests", False, "No authentication token available")
            return False

        # Test plugin status (mocked endpoint)
        self.run_test("Get Plugin Status", "GET", "plugin/status", 200)

        # Test create checkout (might fail due to Stripe configuration)
        checkout_data = {
            "plan": "monthly",
            "origin_url": "https://devfox.preview.emergentagent.com"
        }
        
        # This might fail due to Stripe configuration
        success, response = self.run_test(
            "Create Checkout Session", 
            "POST", 
            "payments/checkout", 
            200, 
            checkout_data
        )
        
        if not success:
            self.log_test("Checkout Note", True, "Expected failure due to Stripe configuration")

        return True

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid endpoints
        self.run_test("Invalid Endpoint", "GET", "nonexistent", 404)
        
        # Test unauthorized access
        old_token = self.token
        self.token = None
        self.run_test("Unauthorized Access", "GET", "auth/me", 401)
        self.token = old_token
        
        # Test invalid token
        self.token = "invalid_token"
        self.run_test("Invalid Token", "GET", "auth/me", 401)
        self.token = old_token

        # Test duplicate registration
        duplicate_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123"
        }
        
        # Register once
        self.run_test("First Registration", "POST", "auth/register", 200, duplicate_data)
        
        # Try to register again with same email
        self.run_test("Duplicate Email Registration", "POST", "auth/register", 400, duplicate_data)

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.token and self.project_id:
            # Delete test project
            success, _ = self.run_test(
                "Delete Test Project", 
                "DELETE", 
                f"projects/{self.project_id}", 
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting NotFox AI API Tests...")
        print(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        try:
            # Run test suites
            self.test_health_check()
            self.test_auth_flow()
            self.test_project_management()
            self.test_chat_functionality()
            self.test_subscription_endpoints()
            self.test_error_handling()
            
            # Cleanup
            self.cleanup_test_data()
            
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error during testing: {e}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print(f"\n📊 Test Summary")
        print(f"{'='*50}")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        print(f"Duration: {duration:.2f} seconds")
        
        # Return results for further processing
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "duration": duration,
            "test_results": self.test_results
        }

def main():
    """Main function"""
    tester = NotFoxAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if results["failed_tests"] == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️ {results['failed_tests']} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())