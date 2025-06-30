const DockerRunner = require('./src/services/docker-runner');

async function testDockerRunner() {
  const runner = new DockerRunner();
  const testId = `test-${Date.now()}`;
  
  console.log('🐳 Testing Docker Runner...');
  
  try {
    // Test container creation
    console.log('\n1. Creating test container...');
    const container = await runner.createContainer(testId);
    console.log('✅ Container created successfully:', container.containerName);
    console.log('📊 Connection info:', container.connectionInfo);
    
    // Test container listing
    console.log('\n2. Listing test containers...');
    const containers = await runner.listTestContainers();
    console.log('✅ Found containers:', containers);
    
    // Wait a moment
    console.log('\n3. Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test container cleanup
    console.log('\n4. Cleaning up container...');
    await runner.removeContainer(container.containerName);
    console.log('✅ Container cleaned up successfully');
    
    console.log('\n🎉 Docker Runner test completed successfully!');
    
  } catch (error) {
    console.error('❌ Docker Runner test failed:', error.message);
    
    // Cleanup on failure
    console.log('\n🧹 Attempting cleanup...');
    await runner.cleanupAllContainers();
    
    process.exit(1);
  }
}

// Check if Docker is available first
async function checkDocker() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync('docker --version');
    console.log('✅ Docker is available');
    return true;
  } catch (error) {
    console.error('❌ Docker is not available. Please install Docker first.');
    console.error('Visit: https://docs.docker.com/get-docker/');
    return false;
  }
}

async function main() {
  const dockerAvailable = await checkDocker();
  if (dockerAvailable) {
    await testDockerRunner();
  }
}

main();
