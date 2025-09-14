const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const userService = require('./services/userService');
const walletService = require('./services/walletService');

// Load protos
const userProtoDef = protoLoader.loadSync(
    path.join(__dirname, 'protos', 'user.proto'),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const walletProtoDef = protoLoader.loadSync(
    path.join(__dirname, 'protos', 'wallet.proto'),
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);

const userProto = grpc.loadPackageDefinition(userProtoDef).user;
const walletProto = grpc.loadPackageDefinition(walletProtoDef).wallet;

global.grpc = grpc;

// Server
const server = new grpc.Server();

// Add Services
server.addService(userProto.UserService.service, userService);
server.addService(walletProto.WalletService.service, walletService);

const startGrpcServer = (port) => {
    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, port) => {
            if (err) {
                console.error('Failed to start gRPC server:', err);
                return;
            }
            server.start();
            console.log(`gRPC server running on port: ${port}`);
        }
    );
}

module.exports = { startGrpcServer };