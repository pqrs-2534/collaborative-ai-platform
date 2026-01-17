// Diagnostic script to check all controllers
console.log('Checking controllers...\n');

const controllers = [
  './controllers/authController',
  './controllers/projectController',
  './controllers/taskController',
  './controllers/aiController',
  './controllers/documentController',
  './controllers/chatController',
  './controllers/analyticsController'
];

controllers.forEach(path => {
  try {
    const controller = require(path);
    const functions = Object.keys(controller);
    console.log(`✅ ${path}`);
    console.log(`   Functions: ${functions.join(', ')}\n`);
  } catch (error) {
    console.error(`❌ ${path}`);
    console.error(`   Error: ${error.message}\n`);
  }
});